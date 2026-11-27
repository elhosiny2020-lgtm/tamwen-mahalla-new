'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  PlusCircle,
  Calculator,
  TrendingUp,
  FileBadge,
  FileSignature,
  History,
  FileSpreadsheet,
  Printer,
  SlidersHorizontal,
  Search,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  Eye,
  Archive,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RotateCcw,
  Wallet,
  MapPin,
  Users,
  Save,
  Pin,
  PinOff,
  Flame,
  Wheat,
  ShieldCheck,
  Layers,
  FileWarning,
  BellRing,
} from 'lucide-react';
import {
  BakeryRecord,
  BakeryAuditChange,
  BakeryColumnConfig,
  BakeryColumnGroupConfig,
  User,
  AlertActionRecord,
  InspectionRecord,
  DebtTransactionRecord,
} from '@/types';
import {
  INITIAL_BAKERIES,
  INITIAL_BAKERY_AUDIT_CHANGES,
  INITIAL_INSPECTIONS,
  INITIAL_DEBT_TRANSACTIONS,
  DEFAULT_LAST_RECALC_TIMESTAMP,
  getStoredBakeries,
  saveStoredBakeries,
  getStoredBakeryAuditChanges,
  addBakeryAuditChange,
  getStoredBakeryColumns,
  saveStoredBakeryColumns,
  getStoredBakeryColumnGroups,
  saveStoredBakeryColumnGroups,
  getLastBakeryRecalcTimestamp,
  setLastBakeryRecalcTimestamp,
  getStoredAlertActions,
  saveStoredAlertActions,
  getStoredInspections,
  saveStoredInspections,
  getStoredDebtTransactions,
  saveStoredDebtTransactions,
  DEFAULT_BAKERY_COLUMNS,
  DEFAULT_BAKERY_COLUMN_GROUPS,
} from '@/lib/mock-db';
import {
  MAHALLA_VILLAGES,
  MAHALLA_LOCAL_UNITS,
  MAHALLA_VILLAGE_TO_LOCAL_UNIT,
  computeBakeryEquations,
  evaluateDocumentExpiry,
  playAlertSound,
  round3,
} from '@/lib/bakery-math';
import {
  formatDateArabic,
  formatArabicNumber,
  formatArabicDecimal,
  toArabicNumerals,
  normalizeSearchText,
  compareTableValues,
} from '@/lib/utils';
import {
  AutoFitColumnSchema,
  getBakeryColumnAutoFitType,
} from '@/lib/table-autofit';
import { useSmartAutoFit } from '@/hooks/useSmartAutoFit';
import { bakeryStep1Schema, bakeryStep2Schema } from '@/lib/zod-schemas';
import BakeryNavigationGrid, { BakerySubTab, getBakeryActiveScreenLabel } from './BakeryNavigationGrid';
import BakeryInspectionModule from './BakeryInspectionModule';
import BakeryDebtsModule from './BakeryDebtsModule';
import AnimatedStatCard from './AnimatedStatCard';
import TableStats from './TableStats';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';
import FactoryResetButton from './FactoryResetButton';
import {
  getActiveLocalUnitsForVillage,
  getActiveVillageNames,
  getAllActiveLocalUnitNames,
  subscribeDropdownLists,
} from '@/lib/dropdown-lists-store';

export type { BakerySubTab };

interface BakeryManagementSystemProps {
  currentUser: User;
  branchName: string;
}

export default function BakeryManagementSystem({ currentUser, branchName }: BakeryManagementSystemProps) {
  const [activeSubTab, setActiveSubTab] = useState<BakerySubTab>('dashboard');
  const [activeFocus, setActiveFocus] = useState<string>('dashboard');
  const [bakeries, setBakeries] = useState<BakeryRecord[]>(INITIAL_BAKERIES);
  const [auditChanges, setAuditChanges] = useState<BakeryAuditChange[]>(INITIAL_BAKERY_AUDIT_CHANGES);
  const [columns, setColumns] = useState<BakeryColumnConfig[]>(DEFAULT_BAKERY_COLUMNS);
  const [columnGroups, setColumnGroups] = useState<BakeryColumnGroupConfig>(DEFAULT_BAKERY_COLUMN_GROUPS);
  const [lastRecalc, setLastRecalc] = useState<string>(DEFAULT_LAST_RECALC_TIMESTAMP);
  const [alertActions, setAlertActions] = useState<AlertActionRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>(INITIAL_INSPECTIONS);
  const [debtTransactions, setDebtTransactions] = useState<DebtTransactionRecord[]>(INITIAL_DEBT_TRANSACTIONS);
  const [selectedStatementBakeryId, setSelectedStatementBakeryId] = useState<string>(INITIAL_BAKERIES[0]?.id || 'bak-101');
  const [collapseRepeatedGeo, setCollapseRepeatedGeo] = useState<boolean>(true);
  const [todayRef, setTodayRef] = useState<string>('2026-11-25');
  const [clientNowIso, setClientNowIso] = useState<string>(DEFAULT_LAST_RECALC_TIMESTAMP);
  const [selectedBakeryIds, setSelectedBakeryIds] = useState<string[]>([]);
  const [subPinnedCols, setSubPinnedCols] = useState<string[]>(['name', 'ownerName', 'bakeryName', 'village']);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const registryScrollRef = useRef<HTMLDivElement | null>(null);

  // Per-table sort states for true numeric/date sorting across ALL sub-tables
  const [quotasSort, setQuotasSort] = useState<{ key: string; asc: boolean }>({ key: 'actualQuota', asc: false });
  const [averagesSort, setAveragesSort] = useState<{ key: string; asc: boolean }>({ key: 'avgPerCapita2025', asc: false });
  const [licensesSort, setLicensesSort] = useState<{ key: string; asc: boolean }>({ key: 'daysRemaining', asc: true });
  const [taxSort, setTaxSort] = useState<{ key: string; asc: boolean }>({ key: 'daysRemaining', asc: true });
  const [contractsSort, setContractsSort] = useState<{ key: string; asc: boolean }>({ key: 'daysRemaining', asc: true });
  const [alertsSort, setAlertsSort] = useState<{ key: string; asc: boolean }>({ key: 'daysRemaining', asc: true });
  const [auditSort, setAuditSort] = useState<{ key: string; asc: boolean }>({ key: 'timestamp', asc: false });
  const [reportsSort, setReportsSort] = useState<{ key: string; asc: boolean }>({ key: 'serialNumber', asc: true });
  const [ownersSort, setOwnersSort] = useState<{ key: string; asc: boolean }>({ key: 'ownerName', asc: true });
  const [villagesSort, setVillagesSort] = useState<{ key: string; asc: boolean }>({ key: 'totalActualQuota', asc: false });
  const [ownersSearch, setOwnersSearch] = useState<string>('');

  const toggleSubPin = (key: string) => {
    setSubPinnedCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const storedBakeries = getStoredBakeries();
      setBakeries(storedBakeries);
      setAuditChanges(getStoredBakeryAuditChanges());
      setColumns(getStoredBakeryColumns(currentUser.id));
      setColumnGroups(getStoredBakeryColumnGroups());
      setLastRecalc(getLastBakeryRecalcTimestamp());
      setAlertActions(getStoredAlertActions());
      setInspections(getStoredInspections());
      setDebtTransactions(getStoredDebtTransactions());
      const nowIso = new Date().toISOString();
      setTodayRef(nowIso.slice(0, 10));
      setClientNowIso(nowIso);
    });
    return () => cancelAnimationFrame(frameId);
  }, [currentUser.id]);

  // اشتراك حي في قائمة القرى والوحدات المحلية المترابطة
  const [dropdownVersion, setDropdownVersion] = useState(0);
  useEffect(() => {
    return subscribeDropdownLists(() => setDropdownVersion((v) => v + 1));
  }, []);

  const liveVillages = useMemo(() => {
    void dropdownVersion;
    const active = getActiveVillageNames();
    return active.length > 0 ? active : MAHALLA_VILLAGES;
  }, [dropdownVersion]);

  const liveAllLocalUnits = useMemo(() => {
    void dropdownVersion;
    const active = getAllActiveLocalUnitNames();
    return active.length > 0 ? active : MAHALLA_LOCAL_UNITS;
  }, [dropdownVersion]);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.65);

  // Toast message
  const [toastMsg, setToastMsg] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Search & Advanced Filters (Section 8)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVillage, setFilterVillage] = useState('all');
  const [filterLocalUnit, setFilterLocalUnit] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterActivityStatus, setFilterActivityStatus] = useState('all');
  const [filterBreadType, setFilterBreadType] = useState('all');
  const [filterLicenseStatus, setFilterLicenseStatus] = useState('all');
  const [filterTaxStatus, setFilterTaxStatus] = useState('all');
  const [filterLeaseStatus, setFilterLeaseStatus] = useState('all');
  const [filterSpecialCondition, setFilterSpecialCondition] = useState<'all' | 'expired_docs' | 'expiring_soon' | 'incomplete'>('all');
  const [sortField, setSortField] = useState<keyof BakeryRecord>('serialNumber');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selected Bakery for Action Modal / Details / Editing
  const [selectedBakery, setSelectedBakery] = useState<BakeryRecord | null>(null);
  const [actionModalType, setActionModalType] = useState<
    null | 'details' | 'edit' | 'quota' | 'equations' | 'licenses' | 'contracts' | 'add_doc' | 'history' | 'single_report'
  >(null);
  const [openMenuBakeryId, setOpenMenuBakeryId] = useState<string | null>(null);

  // Quick edit states inside action modal
  const [editQuotaVal, setEditQuotaVal] = useState<number>(0);
  const [editInsuranceVal, setEditInsuranceVal] = useState<number>(0);
  const [editFactorVal, setEditFactorVal] = useState<660 | 725>(660);
  const [editLicenseNum, setEditLicenseNum] = useState('');
  const [editLicenseExp, setEditLicenseExp] = useState('');
  const [editTaxNum, setEditTaxNum] = useState('');
  const [editTaxExp, setEditTaxExp] = useState('');
  const [editLeaseNum, setEditLeaseNum] = useState('');
  const [editLeaseExp, setEditLeaseExp] = useState('');
  const [editDocNotes, setEditDocNotes] = useState('');
  const [editReason, setEditReason] = useState('');

  // 7-Step Add/Edit Bakery Wizard State (Section 4)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [editingBakeryId, setEditingBakeryId] = useState<string | null>(null);
  const [wizardError, setWizardError] = useState('');
  const [formBakery, setFormBakery] = useState<Partial<BakeryRecord>>({
    bakeryNumber: '',
    posNumber: '',
    name: '',
    ownerName: '',
    ownerNationalId: '',
    phone: '',
    village: 'صفط تراب',
    localUnit: MAHALLA_VILLAGE_TO_LOCAL_UNIT['صفط تراب'],
    address: '',
    activityStatus: 'نشط',
    breadType: 'بلدي مدعم (ماو)',
    breadTypesCount: 1,
    productionFactor: 660,
    productionLineType: 'آلي كامل',
    fuelType: 'غاز طبيعي',
    bakeryCategory: 'نموذجي',
    dailyCapacitySacks: 35,
    operationStatus: 'يعمل بكامل الطاقة',
    startDate: '2020-01-01',
    insuranceAmountEgp: 21150,
    sackPriceEgp: 235,
    actualQuota: 30,
    dailySacksCount: 30,
    remainingDebtEgp: 0,
    insuranceStatus: 'مسدد بالكامل',
    villagePopulation: 35000,
    beneficiaries2023: 9000,
    beneficiaries2024: 9300,
    beneficiaries2025: 9600,
    dailyShareActual2025: 30,
    licenseNumber: '',
    licenseExpiryDate: '2028-01-01',
    taxCardNumber: '',
    taxCardExpiryDate: '2028-01-01',
    commercialRegisterNumber: '',
    commercialRegisterExpiryDate: '2028-01-01',
    leaseContractType: 'تمليك',
    leaseContractNumber: '',
    leaseExpiryDate: '2030-01-01',
    documentNotes: '',
  });

  // Reports & Print States (Sections 11 & 12)
  const [selectedReportId, setSelectedReportId] = useState<number>(1);
  const [printScope, setPrintScope] = useState<'all' | 'single' | 'village' | 'filtered' | 'expired' | 'quotas' | 'averages'>('all');
  const [printSingleBakeryId, setPrintSingleBakeryId] = useState<string>(bakeries[0]?.id || 'bak-101');
  const [printVillageName, setPrintVillageName] = useState<string>('صفط تراب');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [preparerName, setPreparerName] = useState<string>(currentUser.fullName);
  const [reviewerName, setReviewerName] = useState<string>('أ. مروة محمود عبد الله - رئيس قسم المخابز');
  const [managerApprovalName, setManagerApprovalName] = useState<string>('أ. خالد محمد الشناوي - مدير إدارة تموين مركز المحلة الكبرى');

  // Column Editor Modal State (Section 9)
  const [showColumnModal, setShowColumnModal] = useState<boolean>(false);

  // Active non-archived bakeries
  const activeBakeriesList = useMemo(() => bakeries.filter(b => !b.isArchived), [bakeries]);

  // All Generated Document Alerts (Section 7)
  const allAlerts = useMemo(() => {
    const list: {
      alertId: string;
      bakery: BakeryRecord;
      docType: 'license' | 'tax' | 'lease';
      docLabel: string;
      docNumber: string;
      expiryDate: string;
      daysRemaining: number | null;
      status: string;
      severity: string;
      actionState?: AlertActionRecord;
    }[] = [];

    activeBakeriesList.forEach((b) => {
      const licEval = evaluateDocumentExpiry(b.licenseExpiryDate, b.licenseNumber, todayRef);
      if (licEval.severity !== 'valid') {
        const act = alertActions.find(a => a.bakeryId === b.id && a.docType === 'license');
        list.push({
          alertId: `${b.id}-license`,
          bakery: b,
          docType: 'license',
          docLabel: 'رخصة تشغيل المخبز',
          docNumber: b.licenseNumber || 'غير مسجل',
          expiryDate: b.licenseExpiryDate || 'غير محدد',
          daysRemaining: licEval.daysRemaining,
          status: licEval.status,
          severity: licEval.severity,
          actionState: act,
        });
      }

      const taxEval = evaluateDocumentExpiry(b.taxCardExpiryDate, b.taxCardNumber, todayRef);
      if (taxEval.severity !== 'valid') {
        const act = alertActions.find(a => a.bakeryId === b.id && a.docType === 'tax');
        list.push({
          alertId: `${b.id}-tax`,
          bakery: b,
          docType: 'tax',
          docLabel: 'البطاقة الضريبية',
          docNumber: b.taxCardNumber || 'غير مسجل',
          expiryDate: b.taxCardExpiryDate || 'غير محدد',
          daysRemaining: taxEval.daysRemaining,
          status: taxEval.status,
          severity: taxEval.severity,
          actionState: act,
        });
      }

      const leaseEval = evaluateDocumentExpiry(b.leaseExpiryDate, b.leaseContractNumber, todayRef);
      if (leaseEval.severity !== 'valid') {
        const act = alertActions.find(a => a.bakeryId === b.id && a.docType === 'lease');
        list.push({
          alertId: `${b.id}-lease`,
          bakery: b,
          docType: 'lease',
          docLabel: `عقد الإيجار (${b.leaseContractType})`,
          docNumber: b.leaseContractNumber || 'غير مسجل',
          expiryDate: b.leaseExpiryDate || 'غير محدد',
          daysRemaining: leaseEval.daysRemaining,
          status: leaseEval.status,
          severity: leaseEval.severity,
          actionState: act,
        });
      }
    });

    return list;
  }, [activeBakeriesList, alertActions, todayRef]);

  // Play soft notification sound when switching to alerts tab if enabled
  useEffect(() => {
    if (activeSubTab === 'alerts' && soundEnabled && allAlerts.length > 0) {
      const hasExpired = allAlerts.some(a => a.severity === 'expired');
      playAlertSound(hasExpired ? 'expired_license' : 'expiring_contract', soundVolume);
    }
  }, [activeSubTab, soundEnabled, soundVolume, allAlerts]);

  // Filtered and Sorted Bakeries (Section 8)
  const filteredBakeries = useMemo(() => {
    const q = normalizeSearchText(searchQuery);

    const filtered = activeBakeriesList.filter((b) => {
      if (q) {
        const haystack = normalizeSearchText(
          [
            b.name,
            b.ownerName,
            b.managerName || '',
            b.bakeryNumber,
            b.posNumber,
            b.ownerNationalId,
            b.phone,
            b.village,
            b.localUnit,
            b.breadType,
            b.activityStatus,
            b.address,
          ].join(' ')
        );
        if (!haystack.includes(q)) return false;
      }

      if (filterVillage !== 'all' && b.village !== filterVillage) return false;
      if (filterLocalUnit !== 'all' && b.localUnit !== filterLocalUnit) return false;
      if (filterCategory !== 'all' && b.bakeryCategory !== filterCategory) return false;
      if (filterActivityStatus !== 'all' && b.activityStatus !== filterActivityStatus) return false;
      if (filterBreadType !== 'all' && b.breadType !== filterBreadType) return false;

      const licStatus = evaluateDocumentExpiry(b.licenseExpiryDate, b.licenseNumber, todayRef).status;
      const taxStatus = evaluateDocumentExpiry(b.taxCardExpiryDate, b.taxCardNumber, todayRef).status;
      const leaseStatus = evaluateDocumentExpiry(b.leaseExpiryDate, b.leaseContractNumber, todayRef).status;

      if (filterLicenseStatus !== 'all' && licStatus !== filterLicenseStatus) return false;
      if (filterTaxStatus !== 'all' && taxStatus !== filterTaxStatus) return false;
      if (filterLeaseStatus !== 'all' && leaseStatus !== filterLeaseStatus) return false;

      if (filterSpecialCondition === 'expired_docs') {
        if (licStatus !== 'منتهي' && taxStatus !== 'منتهي' && leaseStatus !== 'منتهي') return false;
      } else if (filterSpecialCondition === 'expiring_soon') {
        const isSoon = (s: string) => s.includes('ينتهي');
        if (!isSoon(licStatus) && !isSoon(taxStatus) && !isSoon(leaseStatus)) return false;
      } else if (filterSpecialCondition === 'incomplete') {
        const incomplete =
          !b.commercialRegisterNumber ||
          !b.licenseNumber ||
          !b.taxCardNumber ||
          !b.leaseContractNumber ||
          b.beneficiaries2025 <= 0;
        if (!incomplete) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => compareTableValues(a[sortField], b[sortField], sortAsc));
  }, [
    activeBakeriesList,
    searchQuery,
    filterVillage,
    filterLocalUnit,
    filterCategory,
    filterActivityStatus,
    filterBreadType,
    filterLicenseStatus,
    filterTaxStatus,
    filterLeaseStatus,
    filterSpecialCondition,
    sortField,
    sortAsc,
    todayRef,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredBakeries.length / pageSize));
  const paginatedBakeries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBakeries.slice(start, start + pageSize);
  }, [filteredBakeries, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterVillage('all');
    setFilterLocalUnit('all');
    setFilterCategory('all');
    setFilterActivityStatus('all');
    setFilterBreadType('all');
    setFilterLicenseStatus('all');
    setFilterTaxStatus('all');
    setFilterLeaseStatus('all');
    setFilterSpecialCondition('all');
    setCurrentPage(1);
  };

  // KPI Statistics (Section 13)
  const kpiStats = useMemo(() => {
    const total = activeBakeriesList.length;
    const active = activeBakeriesList.filter(b => b.activityStatus === 'نشط').length;
    const stopped = total - active;
    const totalActualQuota = round3(activeBakeriesList.reduce((acc, b) => acc + b.actualQuota, 0));
    const totalInsuranceQuota = round3(activeBakeriesList.reduce((acc, b) => acc + b.insuranceQuota, 0));
    const totalDailyLoaves = activeBakeriesList.reduce((acc, b) => acc + b.dailyLoavesCount, 0);

    const avg2023 =
      total > 0 ? round3(activeBakeriesList.reduce((acc, b) => acc + b.avgPerCapita2023, 0) / total) : 0;
    const avg2024 =
      total > 0 ? round3(activeBakeriesList.reduce((acc, b) => acc + b.avgPerCapita2024, 0) / total) : 0;
    const avg2025 =
      total > 0 ? round3(activeBakeriesList.reduce((acc, b) => acc + b.avgPerCapita2025, 0) / total) : 0;

    let expiredLicenses = 0;
    let expiringLicenses = 0;
    let expiredTaxCards = 0;
    let expiredContracts = 0;

    activeBakeriesList.forEach(b => {
      const lic = evaluateDocumentExpiry(b.licenseExpiryDate, b.licenseNumber, todayRef);
      if (lic.status === 'منتهي') expiredLicenses++;
      else if (lic.status.includes('ينتهي')) expiringLicenses++;

      const tax = evaluateDocumentExpiry(b.taxCardExpiryDate, b.taxCardNumber, todayRef);
      if (tax.status === 'منتهي') expiredTaxCards++;

      const lease = evaluateDocumentExpiry(b.leaseExpiryDate, b.leaseContractNumber, todayRef);
      if (lease.status === 'منتهي') expiredContracts++;
    });

    const totalDocsToRenew = allAlerts.length;

    return {
      total,
      active,
      stopped,
      totalActualQuota,
      totalInsuranceQuota,
      totalDailyLoaves,
      avg2023,
      avg2024,
      avg2025,
      expiredLicenses,
      expiringLicenses,
      expiredTaxCards,
      expiredContracts,
      totalDocsToRenew,
    };
  }, [activeBakeriesList, allAlerts, todayRef]);

  // Recalculate all bakeries (Section 5)
  const handleRecalculateAllBakeries = () => {
    const recalculated = bakeries.map((b, i) => ({
      ...computeBakeryEquations(b),
      serialNumber: i + 1,
    }));
    setBakeries(recalculated);
    saveStoredBakeries(recalculated);
    const nowIso = new Date().toISOString();
    setLastRecalc(nowIso);
    setLastBakeryRecalcTimestamp(nowIso);

    addBakeryAuditChange({
      bakeryId: 'ALL',
      bakeryName: 'جميع مخابز إدارة تموين مركز المحلة الكبرى',
      actionType: 'إعادة حساب المعادلات',
      fieldName: 'المعادلات الحسابية السبع',
      oldValue: 'تحديث شامل',
      newValue: `إجمالي الحصص الفعلية: ${kpiStats.totalActualQuota} شيكارة — الأرغفة اليومية: ${kpiStats.totalDailyLoaves}`,
      reason: 'إعادة حساب ومطابقة المعادلات السبع لجميع السجلات',
      performedBy: currentUser.fullName,
    });
    setAuditChanges(getStoredBakeryAuditChanges());
    showToast('تم إعادة حساب المعادلات الحسابية السبع لجميع المخابز وحفظ النتائج بنجاح');
  };

  // Open Action Modal for a specific bakery (Section 10)
  const handleOpenAction = (
    bakery: BakeryRecord,
    action: 'details' | 'edit' | 'quota' | 'equations' | 'licenses' | 'contracts' | 'add_doc' | 'history' | 'single_report'
  ) => {
    setOpenMenuBakeryId(null);
    if (action === 'edit') {
      setEditingBakeryId(bakery.id);
      setFormBakery({ ...bakery });
      setWizardStep(1);
      setActiveSubTab('add');
      return;
    }
    if (action === 'single_report') {
      setPrintScope('single');
      setPrintSingleBakeryId(bakery.id);
      setActiveSubTab('print');
      return;
    }

    setSelectedBakery(bakery);
    setEditQuotaVal(bakery.actualQuota);
    setEditInsuranceVal(bakery.insuranceAmountEgp);
    setEditFactorVal(bakery.productionFactor);
    setEditLicenseNum(bakery.licenseNumber);
    setEditLicenseExp(bakery.licenseExpiryDate);
    setEditTaxNum(bakery.taxCardNumber);
    setEditTaxExp(bakery.taxCardExpiryDate);
    setEditLeaseNum(bakery.leaseContractNumber);
    setEditLeaseExp(bakery.leaseExpiryDate);
    setEditDocNotes(bakery.documentNotes);
    setEditReason('');
    setActionModalType(action);
  };

  const handleArchiveBakery = (bakery: BakeryRecord) => {
    setOpenMenuBakeryId(null);
    const updated = bakeries.map(b => (b.id === bakery.id ? { ...b, isArchived: true } : b));
    setBakeries(updated);
    saveStoredBakeries(updated);
    addBakeryAuditChange({
      bakeryId: bakery.id,
      bakeryName: bakery.name,
      actionType: 'أرشفة',
      fieldName: 'حالة السجل',
      oldValue: 'نشط بالسجل',
      newValue: 'مؤرشف إدارياً',
      reason: 'أرشفة السجل وفق الصلاحيات المعتمدة دون حذف من قاعدة البيانات',
      performedBy: currentUser.fullName,
    });
    setAuditChanges(getStoredBakeryAuditChanges());
    showToast(`تم أرشفة سجل (${bakery.name}) بأمان مع الحفاظ الكامل على البيانات`);
  };

  // Save quick action modal edits
  const handleSaveActionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBakery) return;

    let updatedRecord: BakeryRecord = { ...selectedBakery };
    let actionLabel: BakeryAuditChange['actionType'] = 'تعديل بيانات';
    let fieldChanged = 'بيانات المخبز';
    let oldVal = '';
    let newVal = '';

    if (actionModalType === 'quota') {
      actionLabel = 'تعديل حصة';
      fieldChanged = 'الحصة الفعلية والمبلغ التأميني';
      oldVal = `حصة: ${selectedBakery.actualQuota} - تأمين: ${selectedBakery.insuranceAmountEgp}`;
      updatedRecord = computeBakeryEquations({
        ...selectedBakery,
        actualQuota: Number(editQuotaVal),
        dailySacksCount: Number(editQuotaVal),
        insuranceAmountEgp: Number(editInsuranceVal),
        productionFactor: editFactorVal,
        updatedBy: currentUser.fullName,
        updatedAt: new Date().toISOString(),
      });
      newVal = `حصة: ${updatedRecord.actualQuota} - تأمين: ${updatedRecord.insuranceAmountEgp} - أرغفة: ${updatedRecord.dailyLoavesCount}`;
    } else if (actionModalType === 'licenses' || actionModalType === 'add_doc') {
      actionLabel = 'تحديث ترخيص';
      fieldChanged = 'بيانات الرخصة والبطاقة الضريبية';
      oldVal = `رخصة: ${selectedBakery.licenseExpiryDate} / ضريبية: ${selectedBakery.taxCardExpiryDate}`;
      updatedRecord = {
        ...selectedBakery,
        licenseNumber: editLicenseNum,
        licenseExpiryDate: editLicenseExp,
        taxCardNumber: editTaxNum,
        taxCardExpiryDate: editTaxExp,
        documentNotes: editDocNotes,
        updatedBy: currentUser.fullName,
        updatedAt: new Date().toISOString(),
      };
      newVal = `رخصة: ${editLicenseExp} / ضريبية: ${editTaxExp}`;
    } else if (actionModalType === 'contracts') {
      actionLabel = 'تحديث عقد';
      fieldChanged = 'عقد الإيجار';
      oldVal = `${selectedBakery.leaseContractNumber} (${selectedBakery.leaseExpiryDate})`;
      updatedRecord = {
        ...selectedBakery,
        leaseContractNumber: editLeaseNum,
        leaseExpiryDate: editLeaseExp,
        documentNotes: editDocNotes,
        updatedBy: currentUser.fullName,
        updatedAt: new Date().toISOString(),
      };
      newVal = `${editLeaseNum} (${editLeaseExp})`;
    }

    const updatedList = bakeries.map(b => (b.id === selectedBakery.id ? updatedRecord : b));
    setBakeries(updatedList);
    saveStoredBakeries(updatedList);

    addBakeryAuditChange({
      bakeryId: selectedBakery.id,
      bakeryName: selectedBakery.name,
      actionType: actionLabel,
      fieldName: fieldChanged,
      oldValue: oldVal,
      newValue: newVal,
      reason: editReason || 'تحديث معتمد من إدارة المخابز',
      performedBy: currentUser.fullName,
    });
    setAuditChanges(getStoredBakeryAuditChanges());
    setActionModalType(null);
    setSelectedBakery(null);
    showToast('تم حفظ التعديلات وتحديث المعادلات وسجل المراجعة بنجاح');
  };

  // Handle Village Change -> Auto-link Local Unit (Section 4)
  const handleWizardVillageChange = (village: string) => {
    const cascadedUnits = getActiveLocalUnitsForVillage(village);
    const autoUnit =
      cascadedUnits[0] ||
      MAHALLA_VILLAGE_TO_LOCAL_UNIT[village] ||
      'الوحدة المحلية بمركز المحلة الكبرى';
    setFormBakery(prev => ({
      ...prev,
      village,
      localUnit: autoUnit,
    }));
  };

  // Live Computed Wizard Equations preview
  const liveWizardPreview = useMemo(() => computeBakeryEquations(formBakery), [formBakery]);

  // Validate & Move Next in 7-Step Bakery Wizard
  const handleWizardNext = () => {
    setWizardError('');
    if (wizardStep === 1) {
      const res = bakeryStep1Schema.safeParse({
        bakeryNumber: formBakery.bakeryNumber,
        posNumber: formBakery.posNumber,
        name: formBakery.name,
        village: formBakery.village,
        localUnit: formBakery.localUnit,
        address: formBakery.address,
      });
      if (!res.success) {
        setWizardError(res.error.issues[0]?.message || 'يرجى استكمال البيانات الأساسية');
        return;
      }
      // Check uniqueness of bakeryNumber & posNumber
      const duplicateNum = bakeries.find(
        b => b.id !== editingBakeryId && b.bakeryNumber.trim() === formBakery.bakeryNumber?.trim()
      );
      if (duplicateNum) {
        setWizardError(`رقم المخبز (${formBakery.bakeryNumber}) مسجل بالفعل لمخبز (${duplicateNum.name})`);
        return;
      }
      const duplicatePos = bakeries.find(
        b => b.id !== editingBakeryId && b.posNumber.trim().toLowerCase() === formBakery.posNumber?.trim().toLowerCase()
      );
      if (duplicatePos) {
        setWizardError(`رقم ماكينة POS (${formBakery.posNumber}) مسجل بالفعل لمخبز (${duplicatePos.name})`);
        return;
      }
    } else if (wizardStep === 2) {
      const res = bakeryStep2Schema.safeParse({
        ownerName: formBakery.ownerName,
        ownerNationalId: formBakery.ownerNationalId,
        phone: formBakery.phone,
      });
      if (!res.success) {
        setWizardError(res.error.issues[0]?.message || 'يرجى التحقق من الرقم القومي (14 رقماً) ورقم الهاتف (11 رقماً)');
        return;
      }
    }

    if (wizardStep < 7) {
      setWizardStep((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }
  };

  const handleWizardSave = (e: React.FormEvent) => {
    e.preventDefault();
    const computed = computeBakeryEquations(formBakery);

    if (editingBakeryId) {
      const updated = bakeries.map(b =>
        b.id === editingBakeryId
          ? ({
              ...b,
              ...computed,
              id: editingBakeryId,
              updatedBy: currentUser.fullName,
              updatedAt: new Date().toISOString(),
            } as BakeryRecord)
          : b
      );
      setBakeries(updated);
      saveStoredBakeries(updated);
      addBakeryAuditChange({
        bakeryId: editingBakeryId,
        bakeryName: computed.name || 'مخبز',
        actionType: 'تعديل بيانات',
        fieldName: 'ملف المخبز الكامل',
        oldValue: 'بيانات سابقة',
        newValue: `حصة فعلية: ${computed.actualQuota} - أرغفة: ${computed.dailyLoavesCount}`,
        reason: 'تعديل شامل عبر نموذج المخابز الموحد',
        performedBy: currentUser.fullName,
      });
      showToast(`تم تحديث بيانات (${computed.name}) بنجاح`);
    } else {
      const newRecord: BakeryRecord = {
        ...(computed as BakeryRecord),
        id: `bak-${Date.now()}`,
        serialNumber: bakeries.length + 1,
        branchId: 'b-03',
        createdBy: currentUser.fullName,
        createdAt: new Date().toISOString(),
      };
      const updated = [...bakeries, newRecord];
      setBakeries(updated);
      saveStoredBakeries(updated);
      addBakeryAuditChange({
        bakeryId: newRecord.id,
        bakeryName: newRecord.name,
        actionType: 'إضافة مخبز',
        fieldName: 'سجل مخبز جديد',
        oldValue: 'غير موجود',
        newValue: `رقم المخبز: ${newRecord.bakeryNumber} - قرية: ${newRecord.village} - حصة: ${newRecord.actualQuota}`,
        reason: 'إضافة مخبز جديد معتمد بمركز المحلة الكبرى',
        performedBy: currentUser.fullName,
      });
      showToast(`تم إضافة المخبز الجديد (${newRecord.name}) وحفظه في قاعدة البيانات بنجاح`);
    }

    setAuditChanges(getStoredBakeryAuditChanges());
    setEditingBakeryId(null);
    setWizardStep(1);
    setActiveSubTab('registry');
  };

  // Export CSV with UTF-8 BOM for Arabic Excel compatibility (Section 12)
  const handleExportCSV = (recordsToExport: BakeryRecord[], filenamePrefix = 'سجل_مخابز_المحلة_الكبرى') => {
    const visibleCols = [...columns].filter(c => c.visible).sort((a, b) => a.order - b.order);
    const headers = visibleCols.map(c => `"${c.customLabel.replace(/"/g, '""')}"`).join(',');
    const rows = recordsToExport.map(rec =>
      visibleCols
        .map(c => {
          const val = rec[c.key as keyof BakeryRecord];
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير الملف بصيغة إكسل المعتمدة باللغة العربية بنجاح');
  };

  // Handle Alert Renewal or Postpone (Section 7)
  const handleAlertQuickRenew = (bakery: BakeryRecord, docType: 'license' | 'tax' | 'lease') => {
    const nextYearDate = '2028-12-31';
    const updatedList = bakeries.map(b => {
      if (b.id !== bakery.id) return b;
      if (docType === 'license') return { ...b, licenseExpiryDate: nextYearDate };
      if (docType === 'tax') return { ...b, taxCardExpiryDate: nextYearDate };
      return { ...b, leaseExpiryDate: nextYearDate };
    });
    setBakeries(updatedList);
    saveStoredBakeries(updatedList);

    const newAct: AlertActionRecord = {
      id: `alact-${Date.now()}`,
      bakeryId: bakery.id,
      docType,
      action: 'renewed',
      reason: 'تم تجديد المستند رسمياً وتحديث تاريخ الانتهاء',
      timestamp: new Date().toISOString(),
      user: currentUser.fullName,
    };
    const updatedActs = [newAct, ...alertActions];
    setAlertActions(updatedActs);
    saveStoredAlertActions(updatedActs);

    addBakeryAuditChange({
      bakeryId: bakery.id,
      bakeryName: bakery.name,
      actionType: docType === 'lease' ? 'تحديث عقد' : 'تحديث ترخيص',
      fieldName: docType === 'license' ? 'تاريخ انتهاء الرخصة' : docType === 'tax' ? 'انتهاء البطاقة الضريبية' : 'انتهاء عقد الإيجار',
      oldValue: 'منتهي / قارب على الانتهاء',
      newValue: nextYearDate,
      reason: 'تجديد المستند من مركز التنبيهات الذكي',
      performedBy: currentUser.fullName,
    });
    setAuditChanges(getStoredBakeryAuditChanges());
    showToast(`تم تسجيل تجديد المستند لمخبز (${bakery.name}) حتى ${nextYearDate}`);
  };

  const handleAlertPostpone = (bakery: BakeryRecord, docType: 'license' | 'tax' | 'lease') => {
    const newAct: AlertActionRecord = {
      id: `alact-${Date.now()}`,
      bakeryId: bakery.id,
      docType,
      action: 'postponed',
      reason: 'جاري استكمال إجراءات التجديد بالوحدة المحلية والضرائب',
      postponedUntil: 'مهلة 15 يوماً',
      timestamp: new Date().toISOString(),
      user: currentUser.fullName,
    };
    const updatedActs = [newAct, ...alertActions.filter(a => !(a.bakeryId === bakery.id && a.docType === docType))];
    setAlertActions(updatedActs);
    saveStoredAlertActions(updatedActs);
    showToast(`تم تسجيل تأجيل المتابعة لمخبز (${bakery.name}) مع حفظ السبب`);
  };

  // Sorted Visible Columns for Registry Table (49 columns total)
  const visibleColumns = useMemo(
    () => [...columns].filter(c => c.visible).sort((a, b) => a.order - b.order),
    [columns]
  );

  // Lookup custom column header label (reflects customizer across tables, reports, export, print)
  const getColLabel = (key: string, fallback: string) => {
    const found = columns.find((c) => c.key === key);
    return toArabicNumerals(found?.customLabel || fallback);
  };

  // Build Smart Auto-Fit Schema for the 49-Column Registry Table
  const registrySchemaCols: AutoFitColumnSchema[] = useMemo(() => {
    const sampleRows = filteredBakeries.slice(0, 60);
    return visibleColumns.map((col) => {
      const colType = getBakeryColumnAutoFitType(col.key);
      const isDecimalCol =
        col.key === 'avgPerCapita2023' ||
        col.key === 'avgPerCapita2024' ||
        col.key === 'avgPerCapita2025' ||
        col.key === 'avgPerCapitaOverall' ||
        col.key === 'cumulativeAvgDifference' ||
        col.key === 'dailyShareActual2025' ||
        col.key === 'insuranceQuota';
      const isCurrencyCol =
        col.key === 'insuranceAmountEgp' ||
        col.key === 'totalInsuranceValueEgp' ||
        col.key === 'sackPriceEgp' ||
        col.key === 'remainingDebtEgp';
      const isIntegerCol =
        col.key === 'serialNumber' ||
        col.key === 'actualQuota' ||
        col.key === 'dailySacksCount' ||
        col.key === 'dailyCapacitySacks' ||
        col.key === 'productionFactor' ||
        col.key === 'breadTypesCount' ||
        col.key === 'dailyLoavesCount' ||
        col.key === 'villagePopulation' ||
        col.key === 'beneficiaries2023' ||
        col.key === 'beneficiaries2024' ||
        col.key === 'beneficiaries2025';
      const isDateCol = col.key.includes('Date');

      return {
        key: col.key,
        label: toArabicNumerals(col.customLabel),
        type: colType,
        defaultWidth: col.width,
        pinned: col.pinned,
        sampleValues: sampleRows.map((b) => {
          const raw = b[col.key as keyof BakeryRecord];
          if (isDecimalCol) return formatArabicDecimal(Number(raw || 0), 2);
          if (isCurrencyCol) return `${formatArabicNumber(Number(raw || 0))} ج.م`;
          if (isIntegerCol) return formatArabicNumber(Number(raw || 0));
          if (col.key === 'licenseExpiryDate') {
            const ev = evaluateDocumentExpiry(b.licenseExpiryDate, b.licenseNumber, todayRef);
            return `${formatDateArabic(b.licenseExpiryDate)} ${ev.status}`;
          }
          if (isDateCol) return formatDateArabic(String(raw || ''));
          return raw !== undefined && raw !== null ? toArabicNumerals(String(raw)) : '—';
        }),
      };
    });
  }, [visibleColumns, filteredBakeries, todayRef]);

  const registryAutoFit = useSmartAutoFit({
    tableId: 'bakery_registry_49',
    userId: currentUser.id,
    columns: registrySchemaCols,
    containerRef: registryScrollRef,
    onNotify: showToast,
  });

  // Compute RTL cumulative right sticky offsets for pinned columns from live Smart Auto-Fit widths
  const { pinnedOffsetsMap, lastPinnedKey } = useMemo(() => {
    const offsets: Record<string, number> = {};
    let currentRight = 34;
    let lastKey: string | null = null;
    visibleColumns.forEach((col) => {
      if (col.pinned) {
        offsets[col.key] = currentRight;
        currentRight += registryAutoFit.widthsMap[col.key] || col.width || 100;
        lastKey = col.key;
      }
    });
    return { pinnedOffsetsMap: offsets, lastPinnedKey: lastKey };
  }, [visibleColumns, registryAutoFit.widthsMap]);

  // Column Pinning, Reordering & Reset Handlers (persisted per user)
  const handlePinAllColumns = () => {
    // Smart wide-table freeze: pin key identifying columns up to ~460px so horizontal scroll remains functional
    let cumulative = 34;
    const maxSafePinWidth = 460;
    const sorted = [...columns].sort((a, b) => a.order - b.order);
    const pinnedKeys = new Set<string>();
    sorted.forEach((c) => {
      if (!c.visible) return;
      const w = registryAutoFit.widthsMap[c.key] || c.width || 110;
      if (cumulative + w <= maxSafePinWidth) {
        pinnedKeys.add(c.key);
        cumulative += w;
      }
    });
    const updated = columns.map((c) => ({ ...c, pinned: pinnedKeys.has(c.key) }));
    setColumns(updated);
    saveStoredBakeryColumns(updated, currentUser.id);
    showToast(`تم تفعيل التثبيت الذكي لعدد (${formatArabicNumber(pinnedKeys.size)}) أعمدة تعريفية مع بقاء التمرير الأفقي فعالاً`);
  };

  const handleUnpinAllColumns = () => {
    const updated = columns.map((c) => ({ ...c, pinned: false }));
    setColumns(updated);
    saveStoredBakeryColumns(updated, currentUser.id);
    showToast('تم إلغاء تثبيت جميع الأعمدة والعودة للعرض الطبيعي');
  };

  const handleTogglePinColumn = (key: string) => {
    const updated = columns.map((c) => (c.key === key ? { ...c, pinned: !c.pinned } : c));
    setColumns(updated);
    saveStoredBakeryColumns(updated, currentUser.id);
  };

  const handleToggleVisibleColumn = (key: string) => {
    const visibleCount = columns.filter((c) => c.visible).length;
    const target = columns.find((c) => c.key === key);
    if (!target) return;
    if (target.visible && visibleCount <= 1) return;
    const updated = columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c));
    setColumns(updated);
    saveStoredBakeryColumns(updated, currentUser.id);
  };

  const handleMoveColumn = (key: string, direction: 'up' | 'down') => {
    const sorted = [...columns].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.key === key);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const swapped = [...sorted];
    const tmp = swapped[idx];
    swapped[idx] = swapped[targetIdx];
    swapped[targetIdx] = tmp;
    const normalized = swapped.map((c, i) => ({ ...c, order: i + 1 }));
    setColumns(normalized);
    saveStoredBakeryColumns(normalized, currentUser.id);
  };

  const handleResetColumns = () => {
    setColumns(DEFAULT_BAKERY_COLUMNS);
    saveStoredBakeryColumns(DEFAULT_BAKERY_COLUMNS, currentUser.id);
    setColumnGroups(DEFAULT_BAKERY_COLUMN_GROUPS);
    saveStoredBakeryColumnGroups(DEFAULT_BAKERY_COLUMN_GROUPS);
    showToast('تم استعادة الإعدادات الافتراضية لـ ٤٩ عموداً والمجموعات الخمس');
  };

  const toggleSelectBakery = (id: string) => {
    setSelectedBakeryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    const pageIds = paginatedBakeries.map((b) => b.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedBakeryIds.includes(id));
    if (allSelected) {
      setSelectedBakeryIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedBakeryIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Group Super-Headers computed dynamically from consecutive visible columns (supports reordering & hiding)
  const columnGroupSpans = useMemo(() => {
    const spans: { groupKey: BakeryColumnConfig['groupKey']; label: string; colSpan: number }[] = [];
    visibleColumns.forEach((col) => {
      const last = spans[spans.length - 1];
      if (last && last.groupKey === col.groupKey) {
        last.colSpan += 1;
      } else {
        spans.push({
          groupKey: col.groupKey,
          label: columnGroups[col.groupKey],
          colSpan: 1,
        });
      }
    });
    return spans;
  }, [visibleColumns, columnGroups]);

  // Aggregated Villages & Local Units Stats (Group 1 - القرى والوحدات المحلية)
  const villagesSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        village: string;
        localUnit: string;
        count: number;
        activeCount: number;
        totalActualQuota: number;
        totalDailyLoaves: number;
        totalBeneficiaries2025: number;
        totalDebt: number;
      }
    >();
    activeBakeriesList.forEach((b) => {
      const existing = map.get(b.village) || {
        village: b.village,
        localUnit: b.localUnit,
        count: 0,
        activeCount: 0,
        totalActualQuota: 0,
        totalDailyLoaves: 0,
        totalBeneficiaries2025: 0,
        totalDebt: 0,
      };
      existing.count += 1;
      if (b.activityStatus === 'نشط') existing.activeCount += 1;
      existing.totalActualQuota += b.actualQuota;
      existing.totalDailyLoaves += b.dailyLoavesCount;
      existing.totalBeneficiaries2025 += b.beneficiaries2025;
      existing.totalDebt += b.remainingDebtEgp || 0;
      map.set(b.village, existing);
    });
    return Array.from(map.values());
  }, [activeBakeriesList]);

  // Precomputed rows for averages, licenses, contracts & alerts SmartAutoFitTables
  const averagesRows = useMemo(
    () =>
      activeBakeriesList.map((b) => ({
        ...b,
        diff24_23: round3(b.avgPerCapita2024 - b.avgPerCapita2023),
        diff25_24: round3(b.avgPerCapita2025 - b.avgPerCapita2024),
      })),
    [activeBakeriesList]
  );

  const licenseRows = useMemo(
    () =>
      activeBakeriesList.map((b) => {
        const ev = evaluateDocumentExpiry(b.licenseExpiryDate, b.licenseNumber, todayRef);
        return { bakery: b, ...b, daysRemaining: ev.daysRemaining, status: ev.status, severity: ev.severity };
      }),
    [activeBakeriesList, todayRef]
  );

  const taxRows = useMemo(
    () =>
      activeBakeriesList.map((b) => {
        const ev = evaluateDocumentExpiry(b.taxCardExpiryDate, b.taxCardNumber, todayRef);
        return { bakery: b, ...b, daysRemaining: ev.daysRemaining, status: ev.status, severity: ev.severity };
      }),
    [activeBakeriesList, todayRef]
  );

  const contractRows = useMemo(
    () =>
      activeBakeriesList.map((b) => {
        const ev = evaluateDocumentExpiry(b.leaseExpiryDate, b.leaseContractNumber, todayRef);
        return { bakery: b, ...b, daysRemaining: ev.daysRemaining, status: ev.status, severity: ev.severity };
      }),
    [activeBakeriesList, todayRef]
  );

  const alertRows = useMemo(
    () =>
      allAlerts.map((al) => ({
        ...al,
        bakeryName: al.bakery.name,
        ownerName: al.bakery.ownerName,
        village: al.bakery.village,
      })),
    [allAlerts]
  );

  const reportRows = useMemo(
    () =>
      activeBakeriesList.map((b) => {
        const lic = evaluateDocumentExpiry(b.licenseExpiryDate, b.licenseNumber, todayRef);
        const lease = evaluateDocumentExpiry(b.leaseExpiryDate, b.leaseContractNumber, todayRef);
        return {
          ...b,
          licStatus: lic.status,
          leaseStatus: lease.status,
          combinedDocStatus: `رخصة: ${lic.status} | عقد: ${lease.status}`,
        };
      }),
    [activeBakeriesList, todayRef]
  );

  // Handlers for Inspection & Debt modules
  const handleAddInspection = (record: Omit<InspectionRecord, 'id'>) => {
    const newRec: InspectionRecord = { ...record, id: `ins-${Date.now()}` };
    const updated = [newRec, ...inspections];
    setInspections(updated);
    saveStoredInspections(updated);
    showToast(`تم توثيق السجل الرقابي (${record.recordNumber}) لمخبز ${record.bakeryName}`);
  };

  const handleUpdateInspectionStatus = (id: string, status: InspectionRecord['status']) => {
    const updated = inspections.map((r) => (r.id === id ? { ...r, status } : r));
    setInspections(updated);
    saveStoredInspections(updated);
    showToast(`تم تحديث حالة السجل الرقابي إلى (${status})`);
  };

  const handleAddDebtTransaction = (tx: Omit<DebtTransactionRecord, 'id'>) => {
    const newTx: DebtTransactionRecord = { ...tx, id: `dbt-${Date.now()}` };
    const updatedTx = [newTx, ...debtTransactions];
    setDebtTransactions(updatedTx);
    saveStoredDebtTransactions(updatedTx);

    const updatedBakeries = bakeries.map((b) => {
      if (b.id !== tx.bakeryId) return b;
      const delta = tx.direction === 'debit' ? tx.amountEgp : -tx.amountEgp;
      const newDebt = Math.max(0, (b.remainingDebtEgp || 0) + delta);
      return {
        ...b,
        remainingDebtEgp: newDebt,
        insuranceStatus: newDebt === 0 ? ('مسدد بالكامل' as const) : b.insuranceStatus,
        updatedBy: currentUser.fullName,
        updatedAt: new Date().toISOString(),
      };
    });
    setBakeries(updatedBakeries);
    saveStoredBakeries(updatedBakeries);

    addBakeryAuditChange({
      bakeryId: tx.bakeryId,
      bakeryName: tx.bakeryName,
      actionType: 'تعديل بيانات',
      fieldName: 'مديونيات وحسابات المخبز',
      oldValue: tx.category,
      newValue: `${tx.direction === 'debit' ? '+' : '-'}${tx.amountEgp} ج.م (${tx.receiptNumber})`,
      reason: tx.notes,
      performedBy: currentUser.fullName,
    });
    setAuditChanges(getStoredBakeryAuditChanges());
    showToast(`تم اعتماد الحركة المالية (${tx.receiptNumber}) وتحديث رصيد مخبز ${tx.bakeryName}`);
  };

  const handleNavSelect = (tab: BakerySubTab, focus: string) => {
    setActiveSubTab(tab);
    setActiveFocus(focus);
    if (tab === 'add') {
      setEditingBakeryId(null);
      setWizardStep(1);
    } else if (focus === 'registry-search') {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    } else if (focus === 'rep-periodic') {
      setSelectedReportId(4);
    } else if (focus === 'rep-all') {
      setSelectedReportId(1);
    }
  };

  const handleJumpToDebts = (bakery: BakeryRecord) => {
    setSelectedStatementBakeryId(bakery.id);
    setActiveSubTab('debts');
    setActiveFocus('dbt-statement');
  };

  // Badge helper for Document Expiry
  const renderExpiryStatusBadge = (status: string, severity: string) => {
    const styles: Record<string, string> = {
      valid: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      warn30: 'text-blue-800 bg-blue-50 border-blue-200',
      warn15: 'text-amber-800 bg-amber-50 border-amber-200',
      warn7: 'text-orange-800 bg-orange-50 border-orange-200',
      warn3: 'text-red-800 bg-red-50 border-red-200',
      today: 'text-red-900 bg-red-100 border-red-300 font-black',
      expired: 'text-white bg-red-700 border-red-800 font-bold',
      missing: 'text-slate-700 bg-slate-100 border-slate-300',
      review: 'text-purple-800 bg-purple-50 border-purple-200',
    };
    return (
      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded border whitespace-nowrap ${styles[severity] || styles.valid}`}>
        {toArabicNumerals(status)}
      </span>
    );
  };

  // Render Actions Dropdown Menu + Direct Quick-Jumps for any table row (Section 7 & 10)
  const renderActionsMenu = (bakery: BakeryRecord) => {
    const isOpen = openMenuBakeryId === bakery.id;
    return (
      <div className="relative inline-block text-right">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenAction(bakery, 'details')}
            className="px-1.5 py-1 bg-[#102A43] hover:bg-[#164E83] text-white rounded text-[10px] font-bold transition-colors whitespace-nowrap cursor-pointer"
            title="عرض الملف الكامل"
          >
            عرض
          </button>
          <button
            type="button"
            onClick={() => handleOpenAction(bakery, 'licenses')}
            className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded transition-colors cursor-pointer"
            title="انتقال سريع للتراخيص والبطاقة الضريبية"
          >
            <FileBadge className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleJumpToDebts(bakery)}
            className="p-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded transition-colors cursor-pointer"
            title="انتقال سريع لمديونيات وكشف حساب المخبز"
          >
            <Wallet className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenAction(bakery, 'quota')}
            className="p-1 bg-blue-50 hover:bg-blue-100 text-[#164E83] border border-blue-200 rounded transition-colors cursor-pointer"
            title="انتقال سريع لتعديل الحصة والتأمين"
          >
            <Calculator className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setOpenMenuBakeryId(isOpen ? null : bakery.id)}
            className="px-1.5 py-1 bg-[#C6A15B]/20 hover:bg-[#C6A15B]/35 text-[#102A43] border border-[#C6A15B]/50 rounded text-[10px] font-bold transition-colors flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
            title="المزيد من الإجراءات"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {isOpen && (
          <div className="fixed sm:absolute left-4 sm:left-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-1.5 text-xs text-[#102A43]">
            <div className="px-3 py-1.5 border-b border-slate-100 font-black text-[10px] text-[#164E83] truncate">
              {bakery.name} (#{bakery.bakeryNumber})
            </div>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'details')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <Eye className="w-3.5 h-3.5 text-[#164E83]" />
              <span>1. عرض التفاصيل الكاملة</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'edit')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. تعديل البيانات الشامل</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'quota')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-700" />
              <span>3. تعديل الحصة والتأمين</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'equations')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-700" />
              <span>4. مراجعة المعادلات السبع</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'licenses')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <FileBadge className="w-3.5 h-3.5 text-purple-700" />
              <span>5. إدارة التراخيص والضرائب</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'contracts')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <FileSignature className="w-3.5 h-3.5 text-indigo-700" />
              <span>6. إدارة العقود والإيجارات</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'add_doc')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <PlusCircle className="w-3.5 h-3.5 text-teal-700" />
              <span>7. إضافة أو تحديث مستند</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'history')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <History className="w-3.5 h-3.5 text-slate-700" />
              <span>8. عرض سجل التعديلات</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'single_report')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <Printer className="w-3.5 h-3.5 text-[#102A43]" />
              <span>9. طباعة بيانات المخبز</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAction(bakery, 'single_report')}
              className="w-full text-right px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-800" />
              <span>10. إنشاء تقرير خاص بالمخبز</span>
            </button>
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                type="button"
                onClick={() => handleArchiveBakery(bakery)}
                className="w-full text-right px-3 py-1.5 hover:bg-red-50 text-red-700 flex items-center gap-2 font-bold"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>11. أرشفة السجل إدارياً</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Official Header Banner for Bakery Department */}
      <div className="bg-[#102A43] text-white rounded-2xl p-6 shadow-md border border-[#164E83] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#C6A15B] font-extrabold mb-1">
            <span>محافظة الغربية</span>
            <span>·</span>
            <span>مديرية التموين والتجارة الداخلية بالغربية</span>
            <span>·</span>
            <span>{branchName || 'إدارة تموين مركز المحلة الكبرى'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            منظومة إدارة ورقابة المخابز والحصص والتراخيص والعقود المتكاملة
          </h1>
          <p className="text-[11px] font-bold text-slate-200 mt-1">
            النظام المحاسبي والرقابي الموحد · المعادلات الحسابية السبع · متابعة متوسطات (٢٠٢٣–٢٠٢٤–٢٠٢٥) · مركز التنبيهات الذكي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowColumnModal(true)}
            className="px-4 py-2.5 bg-[#164E83] hover:bg-[#1e609e] text-white rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#C6A15B]" />
            <span>تخصيص رؤوس الأعمدة</span>
          </button>
          <button
            type="button"
            onClick={handleRecalculateAllBakeries}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة حساب جميع المخابز</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingBakeryId(null);
              setWizardStep(1);
              setActiveSubTab('add');
            }}
            className="px-4 py-2.5 bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة مخبز جديد</span>
          </button>
          <FactoryResetButton
            sectionName="منظومة إدارة المخابز"
            sectionKey="bakeries"
            currentUser={currentUser}
            tableSummary={[
              { tableName: 'سجل المخابز البلدية المدعمة', count: bakeries.length },
              { tableName: 'سجل الحملات والتفتيش والمخالفات', count: inspections.length },
              { tableName: 'سجل معاملات المديونيات المرتبطة', count: debtTransactions.length },
              { tableName: 'سجل إجراءات التنبيهات والمراجعة', count: alertActions.length + auditChanges.length },
            ]}
            onCaptureBackup={() => ({
              bakeries,
              inspections,
              debtTransactions,
              alertActions,
              auditChanges,
            })}
            onRestoreBackup={(snap) => {
              if (Array.isArray(snap.bakeries)) {
                setBakeries(snap.bakeries as BakeryRecord[]);
                saveStoredBakeries(snap.bakeries as BakeryRecord[]);
              }
              if (Array.isArray(snap.inspections)) {
                setInspections(snap.inspections as InspectionRecord[]);
                saveStoredInspections(snap.inspections as InspectionRecord[]);
              }
              if (Array.isArray(snap.debtTransactions)) {
                setDebtTransactions(snap.debtTransactions as DebtTransactionRecord[]);
                saveStoredDebtTransactions(snap.debtTransactions as DebtTransactionRecord[]);
              }
              if (Array.isArray(snap.alertActions)) {
                setAlertActions(snap.alertActions as AlertActionRecord[]);
                saveStoredAlertActions(snap.alertActions as AlertActionRecord[]);
              }
              showToast('تم استرجاع النسخة الاحتياطية لبيانات المخابز بنجاح.');
            }}
            compact
            onConfirmReset={() => {
              setBakeries([]);
              saveStoredBakeries([]);
              setInspections([]);
              saveStoredInspections([]);
              setDebtTransactions([]);
              saveStoredDebtTransactions([]);
              setAlertActions([]);
              saveStoredAlertActions([]);
              setAuditChanges([]);
              setSelectedBakeryIds([]);
              showToast('تم تنفيذ إعادة ضبط المصنع ومسح جميع بيانات المخابز والتراخيص والحملات والمديونيات بنجاح.');
            }}
          />
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-900 text-white rounded-xl shadow-lg border border-emerald-700 flex items-center justify-between text-[11px] font-extrabold print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C6A15B] shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* خريطة الشاشات بنمط قسم التجارة الداخلية (٦ مجموعات قابلة للطي مع بحث سريع) */}
      <BakeryNavigationGrid
        activeSubTab={activeSubTab}
        activeFocus={activeFocus}
        alertsCount={allAlerts.length}
        violationsCount={inspections.filter((i) => i.type === 'مخالفة' || i.type === 'محضر رسمي').length}
        debtorsCount={activeBakeriesList.filter((b) => (b.remainingDebtEgp || 0) > 0).length}
        onSelect={handleNavSelect}
      />

      {/* شريط عنوان الشاشة النشطة بنفس تصميم قسم التجارة الداخلية */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#164E83]">الشاشة النشطة:</span>
          <h3 className="text-sm font-black text-[#102A43]">
            {getBakeryActiveScreenLabel(activeSubTab, activeFocus)}
          </h3>
        </div>
        <div className="text-[11px] font-bold text-slate-600">
          التاريخ المرجعي: {formatDateArabic(todayRef)} · المستخدم: {currentUser.fullName}
        </div>
      </div>

      {/* =====================================================================
          1. لوحة مؤشرات إدارة المخابز (بنفس تصميم لوحة التحكم في قسم التجارة الداخلية)
         ===================================================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-4">
          {/* ١٤ بطاقة إحصائية مرقمة قابلة للنقر بنظام ٤ أعمدة بنفس تنسيق قسم التجارة الداخلية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <AnimatedStatCard
              title="١. إجمالي عدد المخابز"
              value={kpiStats.total}
              unit="مخبز مسجل"
              indicator="اضغط لفتح السجل"
              icon={Flame}
              theme="navy"
              delay={0}
              onClick={() => handleNavSelect('registry', 'registry')}
            />
            <AnimatedStatCard
              title="٢. المخابز النشطة"
              value={kpiStats.active}
              unit="يعمل بانتظام"
              indicator="تشغيل مستقر"
              icon={CheckCircle2}
              theme="green"
              delay={0.03}
              onClick={() => handleNavSelect('registry', 'registry')}
            />
            <AnimatedStatCard
              title="٣. المخابز المتوقفة"
              value={kpiStats.stopped}
              unit="توقف / صيانة"
              indicator="تستوجب المتابعة"
              icon={XCircle}
              theme="red"
              delay={0.06}
              onClick={() => handleNavSelect('registry', 'registry')}
            />
            <AnimatedStatCard
              title="٤. الحصص الفعلية"
              value={kpiStats.totalActualQuota}
              unit="شيكارة / يوم"
              indicator="إجمالي التوزيع اليومي"
              icon={Wheat}
              theme="gold"
              delay={0.09}
              onClick={() => handleNavSelect('quotas', 'quotas-actual')}
            />
            <AnimatedStatCard
              title="٥. الحصص التأمينية"
              value={kpiStats.totalInsuranceQuota}
              format="decimal"
              decimals={3}
              unit="شيكارة تأمينية"
              indicator="الضمان التأميني"
              icon={ShieldCheck}
              theme="teal"
              delay={0.12}
              onClick={() => handleNavSelect('quotas', 'quotas-insurance')}
            />
            <AnimatedStatCard
              title="٦. الإنتاج اليومي"
              value={kpiStats.totalDailyLoaves}
              unit="رغيف مدعم / يوم"
              indicator="المعادلات السبع"
              icon={Layers}
              theme="green"
              delay={0.15}
              onClick={() => handleNavSelect('quotas', 'quotas-loaves')}
            />
            <AnimatedStatCard
              title="٧. متوسط الفرد ٢٠٢٣"
              value={kpiStats.avg2023}
              format="decimal"
              decimals={2}
              unit="رغيف / فرد"
              indicator="مؤشر عام ٢٠٢٣"
              icon={TrendingUp}
              theme="purple"
              delay={0.18}
              onClick={() => handleNavSelect('averages', 'avg-percapita')}
            />
            <AnimatedStatCard
              title="٨. متوسط الفرد ٢٠٢٤"
              value={kpiStats.avg2024}
              format="decimal"
              decimals={2}
              unit="رغيف / فرد"
              indicator="مؤشر عام ٢٠٢٤"
              icon={TrendingUp}
              theme="teal"
              delay={0.21}
              onClick={() => handleNavSelect('averages', 'avg-percapita')}
            />
            <AnimatedStatCard
              title="٩. متوسط الفرد ٢٠٢٥"
              value={kpiStats.avg2025}
              format="decimal"
              decimals={2}
              unit="رغيف / فرد"
              indicator="مؤشر عام ٢٠٢٥"
              icon={TrendingUp}
              theme="navy"
              delay={0.24}
              onClick={() => handleNavSelect('averages', 'avg-percapita')}
            />
            <AnimatedStatCard
              title="١٠. التراخيص المنتهية"
              value={kpiStats.expiredLicenses}
              unit="رخصة منتهية"
              indicator="تستوجب الإنذار"
              icon={FileWarning}
              theme="red"
              delay={0.26}
              onClick={() => handleNavSelect('licenses', 'doc-licenses')}
            />
            <AnimatedStatCard
              title="١١. التراخيص قريبة الانتهاء"
              value={kpiStats.expiringLicenses}
              unit="خلال ٣٠ يوماً"
              indicator="تنبيهات التجديد"
              icon={AlertTriangle}
              theme="gold"
              delay={0.28}
              onClick={() => handleNavSelect('licenses', 'doc-licenses')}
            />
            <AnimatedStatCard
              title="١٢. البطاقات الضريبية المنتهية"
              value={kpiStats.expiredTaxCards}
              unit="بطاقة ضريبية"
              indicator="سجل الضرائب"
              icon={FileBadge}
              theme="red"
              delay={0.3}
              onClick={() => handleNavSelect('licenses', 'doc-tax')}
            />
            <AnimatedStatCard
              title="١٣. عقود الإيجار المنتهية"
              value={kpiStats.expiredContracts}
              unit="عقد إيجار"
              indicator="سجل العقود"
              icon={FileSignature}
              theme="purple"
              delay={0.32}
              onClick={() => handleNavSelect('contracts', 'doc-contracts')}
            />
            <AnimatedStatCard
              title="١٤. إجمالي المستندات للتجديد"
              value={kpiStats.totalDocsToRenew}
              unit="مستند للتجديد"
              indicator="مركز التنبيهات الذكي"
              icon={BellRing}
              theme="gold"
              delay={0.34}
              onClick={() => handleNavSelect('alerts', 'doc-alerts')}
            />
          </div>

          {/* الرسوم البيانية واللوحات التحليلية بنمط قسم التجارة الداخلية (شبكة ٢×٢ متناسقة) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ١. توزيع المخابز والحصص حسب القرى */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                <h4 className="text-xs font-black text-[#102A43]">
                  ١. توزيع الحصص الفعلية والإنتاج اليومي حسب القرى
                </h4>
                <span className="text-[10.5px] font-bold text-slate-500">
                  {branchName || 'إدارة تموين مركز المحلة الكبرى'}
                </span>
              </div>
              <div className="space-y-2.5">
                {activeBakeriesList.slice(0, 6).map((b) => {
                  const pct = Math.min(100, Math.round((b.actualQuota / Math.max(1, kpiStats.totalActualQuota)) * 100));
                  return (
                    <div key={b.id} className="space-y-1 text-xs">
                      <div className="flex justify-between gap-2 font-black">
                        <span className="text-[#102A43]">
                          {b.village} — {b.name}
                        </span>
                        <span className="num-cell text-[#164E83] shrink-0">
                          {formatArabicNumber(b.actualQuota)} شيكارة ({formatArabicNumber(b.dailyLoavesCount)} رغيف)
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#102A43] rounded-full"
                          style={{ width: `${Math.max(12, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ٢. موقف التراخيص والبطاقات الضريبية والعقود */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-[#102A43] pb-1.5 border-b border-slate-100">
                  ٢. موقف التراخيص والبطاقات الضريبية والعقود والمستندات
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-slate-600 font-bold block">مخابز نشطة</span>
                    <span className="num-cell font-black text-emerald-800 text-base">
                      {toArabicNumerals(kpiStats.active)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-slate-600 font-bold block">قاربت الانتهاء</span>
                    <span className="num-cell font-black text-amber-800 text-base">
                      {toArabicNumerals(kpiStats.expiringLicenses)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
                    <span className="text-slate-600 font-bold block">مستندات منتهية</span>
                    <span className="num-cell font-black text-red-800 text-base">
                      {toArabicNumerals(kpiStats.expiredLicenses + kpiStats.expiredTaxCards + kpiStats.expiredContracts)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-black text-slate-700">
                  إجمالي التنبيهات النشطة: <span className="num-cell text-red-700">{formatArabicNumber(kpiStats.totalDocsToRenew)}</span> مستند
                </span>
                <button
                  type="button"
                  onClick={() => handleNavSelect('alerts', 'doc-alerts')}
                  className="px-3.5 py-1.5 bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] rounded-xl text-[11px] font-black cursor-pointer"
                >
                  فتح مركز التنبيهات ({formatArabicNumber(allAlerts.length)})
                </button>
              </div>
            </div>

            {/* ٣. مقارنة متوسطات نصيب الفرد للسنوات الثلاث */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h4 className="text-xs font-black text-[#102A43]">
                  ٣. مقارنة متوسط نصيب الفرد اليومي (٢٠٢٣ – ٢٠٢٤ – ٢٠٢٥)
                </h4>
                <span className="text-[10.5px] font-bold text-slate-500">رقمان عشريان</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                {[
                  { yr: 'عام ٢٠٢٣', val: kpiStats.avg2023 },
                  { yr: 'عام ٢٠٢٤', val: kpiStats.avg2024 },
                  { yr: 'عام ٢٠٢٥', val: kpiStats.avg2025 },
                ].map((item) => (
                  <div key={item.yr} className="bg-[#F4F7FB] p-3 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-extrabold text-slate-700 block">{item.yr}</span>
                    <span className="num-cell text-lg font-black text-[#102A43] block my-1">
                      {formatArabicDecimal(item.val, 2)}
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-600">رغيف / فرد</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ٤. الموقف الرقابي والمالي للمخابز */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <h4 className="text-xs font-black text-[#102A43] pb-1.5 border-b border-slate-100">
                ٤. الموقف الرقابي والمخالفات والمديونيات بالمخابز
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-black">
                  <span className="text-slate-700">إجمالي الحملات والمحاضر الرقابية المسجلة:</span>
                  <span className="num-cell text-[#164E83]">{toArabicNumerals(inspections.length)} سجل</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-black">
                  <span className="text-slate-700">عدد المخابز التي عليها مديونيات قائمة:</span>
                  <span className="num-cell text-red-700">
                    {toArabicNumerals(activeBakeriesList.filter((b) => (b.remainingDebtEgp || 0) > 0).length)} مخبز
                  </span>
                </div>
                <div className="flex items-center justify-between font-black">
                  <span className="text-slate-700">إجمالي الحصص الفعلية / التأمينية اليومية:</span>
                  <span className="num-cell text-emerald-700">
                    {formatArabicNumber(kpiStats.totalActualQuota)} / {formatArabicDecimal(kpiStats.totalInsuranceQuota, 3)} شيكارة
                  </span>
                </div>
              </div>
              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleNavSelect('inspection', 'ins-campaigns')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-[#102A43] border border-slate-200 text-[11px] font-black cursor-pointer"
                >
                  الرقابة والتفتيش
                </button>
                <button
                  type="button"
                  onClick={() => handleNavSelect('debts', 'dbt-all')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-[#102A43] border border-slate-200 text-[11px] font-black cursor-pointer"
                >
                  المديونيات والغرامات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. سجل بيانات المخابز الشامل (Sections 3, 8, 9, 10)
         ===================================================================== */}
      {activeSubTab === 'registry' && (
        <div className="space-y-3.5">
          {/* Unified Search & Advanced Filters Engine */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="بحث فوري (أرقام عربية أو إنجليزية): اسم المخبز، المالك، رقم المخبز، رقم الماكينة، الرقم القومي، الهاتف، القرية..."
                  className="w-full pr-10 pl-4 py-2.5 bg-[#F4F7FB] border border-slate-300 rounded-xl text-xs text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#164E83] focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>مسح جميع الفلاتر</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV(filteredBakeries)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير إكسل</span>
                </button>
              </div>
            </div>

            {/* Advanced Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 mb-1">القرية</label>
                <select
                  value={filterVillage}
                  onChange={(e) => {
                    setFilterVillage(e.target.value);
                    setFilterLocalUnit('all');
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold"
                >
                  <option value="all">جميع القرى</option>
                  {liveVillages.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 mb-1">الوحدة المحلية</label>
                <select
                  value={filterLocalUnit}
                  onChange={(e) => {
                    setFilterLocalUnit(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold"
                >
                  <option value="all">جميع الوحدات المحلية</option>
                  {(filterVillage !== 'all'
                    ? getActiveLocalUnitsForVillage(filterVillage)
                    : liveAllLocalUnits
                  ).map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 mb-1">حالة النشاط</label>
                <select
                  value={filterActivityStatus}
                  onChange={(e) => {
                    setFilterActivityStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold"
                >
                  <option value="all">الكل</option>
                  <option value="نشط">نشط</option>
                  <option value="متوقف">متوقف</option>
                  <option value="تحت الفحص">تحت الفحص</option>
                  <option value="مغلق إدارياً">مغلق إدارياً</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 mb-1">نوع الخبز</label>
                <select
                  value={filterBreadType}
                  onChange={(e) => {
                    setFilterBreadType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold"
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="بلدي مدعم (ماو)">بلدي مدعم (ماو — ٦٦٠)</option>
                  <option value="بلدي مدعم (ملدن)">بلدي مدعم (ملدن — ٧٢٥)</option>
                  <option value="طباقي">طباقي</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 mb-1">تصنيف المخبز</label>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold"
                >
                  <option value="all">جميع التصنيفات</option>
                  <option value="ممتاز أ">ممتاز أ</option>
                  <option value="نموذجي">نموذجي</option>
                  <option value="عادي">عادي</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 mb-1">فلتر الرقابة الذكي</label>
                <select
                  value={filterSpecialCondition}
                  onChange={(e) => {
                    setFilterSpecialCondition(e.target.value as 'all' | 'expired_docs' | 'expiring_soon' | 'incomplete');
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] font-extrabold text-[#102A43]"
                >
                  <option value="all">جميع السجلات</option>
                  <option value="expired_docs">مخابز لديها مستندات منتهية</option>
                  <option value="expiring_soon">مستندات تنتهي خلال ٣٠ يوماً</option>
                  <option value="incomplete">مخابز ذات بيانات ناقصة</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live TableStats Bar + Pinning Manager + Header Customizer + Smart Auto-Fit Toolbar */}
          <TableStats
            totalRecords={activeBakeriesList.length}
            displayedRecords={paginatedBakeries.length}
            filteredRecords={filteredBakeries.length}
            selectedRecords={selectedBakeryIds.length}
            totalColumns={columns.length}
            visibleColumns={visibleColumns.length}
            columns={[...columns]
              .sort((a, b) => a.order - b.order)
              .map((c) => ({
                key: c.key,
                label: c.customLabel,
                pinned: c.pinned,
                visible: c.visible,
              }))}
            onPinAll={handlePinAllColumns}
            onUnpinAll={handleUnpinAllColumns}
            onTogglePinColumn={handleTogglePinColumn}
            onToggleVisibleColumn={handleToggleVisibleColumn}
            onMoveColumn={handleMoveColumn}
            onResetPinDefaults={handleResetColumns}
            onOpenHeaderCustomizer={() => setShowColumnModal(true)}
            onClearSelection={() => setSelectedBakeryIds([])}
            autoFitMode={registryAutoFit.autoFitMode}
            hasSavedWidths={registryAutoFit.hasSavedWidths}
            onAutoFitAll={() => registryAutoFit.applyAutoFit('auto')}
            onAutoFitHeaders={() => registryAutoFit.applyAutoFit('headers')}
            onAutoFitData={() => registryAutoFit.applyAutoFit('data')}
            onDistributeEqual={() => registryAutoFit.applyAutoFit('equal')}
            onResetWidths={registryAutoFit.resetWidths}
            onSaveWidths={registryAutoFit.saveCurrentWidths}
          />

          {/* Group Color Legend & Compact Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-[10.5px] font-extrabold">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[#102A43] text-white">{toArabicNumerals(columnGroups.basic)}</span>
              <span className="px-2.5 py-0.5 rounded bg-[#164E83] text-white">{toArabicNumerals(columnGroups.operation)}</span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-900 text-white">{toArabicNumerals(columnGroups.quota)}</span>
              <span className="px-2.5 py-0.5 rounded bg-amber-800 text-white">{toArabicNumerals(columnGroups.population)}</span>
              <span className="px-2.5 py-0.5 rounded bg-slate-800 text-white">{toArabicNumerals(columnGroups.documents)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10.5px] text-[#102A43] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={collapseRepeatedGeo}
                  onChange={(e) => setCollapseRepeatedGeo(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#102A43]"
                />
                <span>دمج بصري للقرى/الوحدات المتكررة</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">صفوف الصفحة:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 border border-slate-300 rounded text-[11px] font-extrabold"
                >
                  <option value={5}>٥</option>
                  <option value={10}>١٠</option>
                  <option value={25}>٢٥</option>
                  <option value={50}>٥٠</option>
                </select>
              </div>
            </div>
          </div>

          {/* Comprehensive 49-Column Bakeries Data Grid with Smart Auto-Fit, Dynamic Grouped Super-Headers, Sticky RTL Pinning & True Numeric Sorting */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div ref={registryScrollRef} className="overflow-auto max-h-[68vh] compact-table-scroll">
              <table className="min-w-full w-max text-right">
                <thead className="sticky top-0 z-30 shadow-xs">
                  {/* Grouped Super-Header Row (Dynamic colSpan on reorder/hide) */}
                  <tr className="table-group-header text-white border-b border-white/20">
                    <th className="bg-[#0B1F33] text-[#C6A15B] text-center sticky right-0 z-40 border-l border-white/20 w-[34px] min-w-[34px] max-w-[34px]">
                      تحديد
                    </th>
                    {columnGroupSpans.map((span, idx) => {
                      const spanBg =
                        span.groupKey === 'basic'
                          ? 'bg-[#0B1F33]'
                          : span.groupKey === 'operation'
                          ? 'bg-[#103B66]'
                          : span.groupKey === 'quota'
                          ? 'bg-emerald-950'
                          : span.groupKey === 'population'
                          ? 'bg-amber-950'
                          : 'bg-slate-900';
                      return (
                        <th
                          key={`${span.groupKey}-${idx}`}
                          colSpan={span.colSpan}
                          className={`text-center border-l border-white/20 ${spanBg}`}
                        >
                          {toArabicNumerals(span.label)}
                        </th>
                      );
                    })}
                    <th className="bg-[#0B1F33] text-[#C6A15B] text-center sticky left-0 z-40 border-r border-white/20 w-[114px] min-w-[114px]">
                      الإجراءات والتحكم
                    </th>
                  </tr>

                  {/* Column Headers Row (2-Line Auto-Fit Labels, Individual Pin/Unpin & Sort Arrows) */}
                  <tr className="bg-[#102A43] text-white border-b border-slate-300">
                    <th className="bg-[#102A43] text-center sticky right-0 z-40 border-l border-white/15 w-[34px] min-w-[34px] max-w-[34px]">
                      <input
                        type="checkbox"
                        checked={
                          paginatedBakeries.length > 0 &&
                          paginatedBakeries.every((b) => selectedBakeryIds.includes(b.id))
                        }
                        onChange={toggleSelectAllVisible}
                        title="تحديد كافة المخابز المعروضة في الصفحة"
                        className="w-3.5 h-3.5 accent-[#C6A15B] cursor-pointer"
                      />
                    </th>
                    {visibleColumns.map((col) => {
                      const groupBg =
                        col.groupKey === 'basic'
                          ? 'bg-[#102A43]'
                          : col.groupKey === 'operation'
                          ? 'bg-[#164E83]'
                          : col.groupKey === 'quota'
                          ? 'bg-emerald-900'
                          : col.groupKey === 'population'
                          ? 'bg-amber-900'
                          : 'bg-slate-800';
                      const isActiveSort = sortField === col.key;
                      const isPinned = col.pinned && pinnedOffsetsMap[col.key] !== undefined;
                      const isLastPinned = lastPinnedKey === col.key;

                      const renderHeaderTitle = () => {
                        if (col.key === 'beneficiaries2023' && col.customLabel === col.defaultLabel)
                          return <span className="flex flex-col items-center leading-tight"><span>المستفيدين</span><span className="text-[#C6A15B]">٢٠٢٣</span></span>;
                        if (col.key === 'beneficiaries2024' && col.customLabel === col.defaultLabel)
                          return <span className="flex flex-col items-center leading-tight"><span>المستفيدين</span><span className="text-[#C6A15B]">٢٠٢٤</span></span>;
                        if (col.key === 'beneficiaries2025' && col.customLabel === col.defaultLabel)
                          return <span className="flex flex-col items-center leading-tight"><span>المستفيدين</span><span className="text-[#C6A15B]">٢٠٢٥</span></span>;
                        if (col.key === 'avgPerCapita2023' && col.customLabel === col.defaultLabel)
                          return <span className="flex flex-col items-center leading-tight"><span>متوسط</span><span className="text-[#C6A15B]">٢٠٢٣</span></span>;
                        if (col.key === 'avgPerCapita2024' && col.customLabel === col.defaultLabel)
                          return <span className="flex flex-col items-center leading-tight"><span>متوسط</span><span className="text-[#C6A15B]">٢٠٢٤</span></span>;
                        if (col.key === 'avgPerCapita2025' && col.customLabel === col.defaultLabel)
                          return <span className="flex flex-col items-center leading-tight"><span>متوسط</span><span className="text-[#C6A15B]">٢٠٢٥</span></span>;
                        return <span className="leading-snug">{toArabicNumerals(col.customLabel)}</span>;
                      };

                      const isNumericCol =
                        col.key === 'serialNumber' ||
                        col.groupKey === 'quota' ||
                        col.groupKey === 'population';

                      return (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (sortField === col.key) setSortAsc(!sortAsc);
                            else {
                              setSortField(col.key as keyof BakeryRecord);
                              setSortAsc(true);
                            }
                          }}
                          title={`${col.customLabel} — انقر للفرز`}
                          style={{
                            ...registryAutoFit.getColStyle(col.key),
                            ...(isPinned ? { right: `${pinnedOffsetsMap[col.key]}px` } : {}),
                          }}
                          className={`group cursor-pointer select-none autofit-header-cell border-l border-white/15 ${groupBg} hover:brightness-110 ${
                            isNumericCol ? 'text-center' : 'text-right'
                          } ${isPinned ? 'sticky z-30' : ''} ${isLastPinned ? 'pinned-col-edge' : ''}`}
                        >
                          <div className={`flex items-center gap-1 ${isNumericCol ? 'justify-center' : 'justify-between'}`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePinColumn(col.key);
                              }}
                              title={col.pinned ? 'إلغاء تثبيت العمود' : 'تثبيت العمود'}
                              className={`p-0.5 rounded transition-opacity cursor-pointer shrink-0 ${
                                col.pinned
                                  ? 'text-[#C6A15B] opacity-100'
                                  : 'text-white/60 opacity-0 group-hover:opacity-100 hover:text-[#C6A15B]'
                              }`}
                            >
                              {col.pinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
                            </button>
                            <div className="flex items-center gap-1 min-w-0">
                              {renderHeaderTitle()}
                              {isActiveSort ? (
                                sortAsc ? (
                                  <ArrowUp className="w-3 h-3 text-[#C6A15B] shrink-0" />
                                ) : (
                                  <ArrowDown className="w-3 h-3 text-[#C6A15B] shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-[#C6A15B] opacity-55 shrink-0" />
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                    {/* Mandatory Fixed Actions Column */}
                    <th className="bg-[#102A43] text-[#C6A15B] text-center whitespace-nowrap sticky left-0 z-40 border-r border-white/20 shadow-md w-[114px] min-w-[114px]">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedBakeries.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 2} className="py-10 text-center text-slate-500">
                        لا توجد مخابز مطابقة لمعايير البحث أو الفلترة الحالية.
                      </td>
                    </tr>
                  ) : (
                    paginatedBakeries.map((bakery, rowIdx) => {
                      const prevRow = rowIdx > 0 ? paginatedBakeries[rowIdx - 1] : null;
                      const isRowSelected = selectedBakeryIds.includes(bakery.id);
                      const rowSolidBg = isRowSelected
                        ? 'bg-amber-50'
                        : rowIdx % 2 === 0
                        ? 'bg-white'
                        : 'bg-[#F4F7FB]';
                      return (
                        <tr
                          key={bakery.id}
                          className={`${rowSolidBg} hover:bg-blue-50/80 transition-colors`}
                        >
                          <td className={`text-center sticky right-0 z-20 border-l border-slate-200 w-[34px] min-w-[34px] max-w-[34px] ${rowSolidBg}`}>
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleSelectBakery(bakery.id)}
                              aria-label={`تحديد ${bakery.name}`}
                              className="w-3.5 h-3.5 accent-[#102A43] cursor-pointer"
                            />
                          </td>
                          {visibleColumns.map((col) => {
                            const rawVal = bakery[col.key as keyof BakeryRecord];
                            const isPinned = col.pinned && pinnedOffsetsMap[col.key] !== undefined;
                            const isLastPinned = lastPinnedKey === col.key;
                            const isNumericOrCode =
                              typeof rawVal === 'number' ||
                              col.key.includes('Date') ||
                              col.key.includes('Number') ||
                              col.key.includes('Id') ||
                              col.key === 'phone';
                            const isDecimalCol =
                              col.key === 'avgPerCapita2023' ||
                              col.key === 'avgPerCapita2024' ||
                              col.key === 'avgPerCapita2025' ||
                              col.key === 'avgPerCapitaOverall' ||
                              col.key === 'cumulativeAvgDifference' ||
                              col.key === 'dailyShareActual2025' ||
                              col.key === 'insuranceQuota';
                            const isCurrencyCol =
                              col.key === 'insuranceAmountEgp' ||
                              col.key === 'totalInsuranceValueEgp' ||
                              col.key === 'sackPriceEgp' ||
                              col.key === 'remainingDebtEgp';
                            const isIntegerCol =
                              col.key === 'serialNumber' ||
                              col.key === 'actualQuota' ||
                              col.key === 'dailySacksCount' ||
                              col.key === 'dailyCapacitySacks' ||
                              col.key === 'productionFactor' ||
                              col.key === 'breadTypesCount' ||
                              col.key === 'dailyLoavesCount' ||
                              col.key === 'villagePopulation' ||
                              col.key === 'beneficiaries2023' ||
                              col.key === 'beneficiaries2024' ||
                              col.key === 'beneficiaries2025';
                            const isDateCol = col.key.includes('Date');

                            const fullTextTitle =
                              rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
                                ? toArabicNumerals(String(rawVal))
                                : undefined;

                            // Safe visual de-duplication for consecutive identical village/localUnit
                            const isRepeatedGeo =
                              collapseRepeatedGeo &&
                              prevRow &&
                              ((col.key === 'village' && prevRow.village === bakery.village) ||
                                (col.key === 'localUnit' && prevRow.localUnit === bakery.localUnit));

                            let displayNode: React.ReactNode = toArabicNumerals(String(rawVal ?? '—'));

                            if (isRepeatedGeo) {
                              displayNode = (
                                <span className="text-slate-400 select-none" title={`${col.customLabel}: ${String(rawVal)}`}>
                                  〃
                                </span>
                              );
                            } else if (col.key === 'posNumber') {
                              displayNode = (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAction(bakery, 'details')}
                                  title="اضغط لفتح ملف المخبز"
                                  className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white text-[#102A43] transition-colors cursor-pointer"
                                >
                                  {toArabicNumerals(String(rawVal ?? '—'))}
                                </button>
                              );
                            } else if (col.key === 'name' || col.key === 'ownerName') {
                              displayNode = (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAction(bakery, 'details')}
                                  className="font-black text-[#102A43] hover:text-[#164E83] hover:underline text-right cursor-pointer"
                                >
                                  {toArabicNumerals(String(rawVal ?? '—'))}
                                </button>
                              );
                            } else if (isDecimalCol) {
                              displayNode = formatArabicDecimal(rawVal as number, 2);
                            } else if (isCurrencyCol) {
                              displayNode = `${formatArabicNumber(rawVal as number)} ج.م`;
                            } else if (isIntegerCol) {
                              displayNode = formatArabicNumber(rawVal as number);
                            } else if (col.key === 'activityStatus') {
                              displayNode = (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                    rawVal === 'نشط'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-red-50 text-red-800 border-red-200'
                                  }`}
                                >
                                  {String(rawVal)}
                                </span>
                              );
                            } else if (col.key === 'licenseExpiryDate') {
                              const ev = evaluateDocumentExpiry(bakery.licenseExpiryDate, bakery.licenseNumber, todayRef);
                              displayNode = (
                                <div className="flex items-center justify-center gap-1">
                                  <span>{formatDateArabic(bakery.licenseExpiryDate)}</span>
                                  {renderExpiryStatusBadge(ev.status, ev.severity)}
                                </div>
                              );
                            } else if (isDateCol) {
                              displayNode = formatDateArabic(String(rawVal || ''));
                            }

                            const isCenterAligned =
                              isNumericOrCode || col.key === 'activityStatus' || col.key === 'leaseContractType' || isRepeatedGeo;

                            return (
                              <td
                                key={col.key}
                                title={fullTextTitle}
                                style={{
                                  ...registryAutoFit.getColStyle(col.key),
                                  ...(isPinned ? { right: `${pinnedOffsetsMap[col.key]}px` } : {}),
                                }}
                                className={`border-l border-slate-100 ${
                                  isNumericOrCode ? 'num-cell' : registryAutoFit.getCellWrapClass(col.key)
                                } ${isCenterAligned ? 'text-center' : 'text-right'} ${
                                  isPinned ? `sticky z-20 ${rowSolidBg}` : ''
                                } ${isLastPinned ? 'pinned-col-edge' : ''} ${
                                  col.key === 'remainingDebtEgp' && Number(rawVal || 0) > 0
                                    ? 'text-red-700 font-extrabold'
                                    : col.groupKey === 'quota' || col.groupKey === 'population' || col.key === 'ownerName' || col.key === 'name'
                                    ? 'text-[#102A43]'
                                    : 'text-[#243447]'
                                }`}
                              >
                                {displayNode}
                              </td>
                            );
                          })}

                          {/* Sticky Actions & Quick-Jump Column */}
                          <td className={`text-center whitespace-nowrap sticky left-0 border-r border-slate-200 z-20 w-[114px] min-w-[114px] ${rowSolidBg}`}>
                            {renderActionsMenu(bakery)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-2.5 bg-[#F4F7FB] border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-700 font-bold">
                صفحة <strong>{formatArabicNumber(currentPage)}</strong> من <strong>{formatArabicNumber(totalPages)}</strong> · إجمالي النتائج: <strong>{formatArabicNumber(filteredBakeries.length)}</strong> مخبز
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2B. بيانات أصحاب المخابز والمديرين المسؤولين (Group 1)
         ===================================================================== */}
      {activeSubTab === 'owners' && (() => {
        const filteredOwners = activeBakeriesList.filter((b) => {
          const q = normalizeSearchText(ownersSearch);
          if (!q) return true;
          return normalizeSearchText(`${b.ownerName} ${b.managerName || ''} ${b.phone} ${b.ownerNationalId} ${b.name} ${b.village} ${b.posNumber}`).includes(q);
        });

        const ownerColumns: SmartTableColumn<BakeryRecord>[] = [
          {
            key: 'serialNumber',
            label: 'م',
            headerText: 'م',
            type: 'numeric',
            align: 'center',
            defaultWidth: 55,
            measureValue: (b) => formatArabicNumber(b.serialNumber),
            render: (b) => formatArabicNumber(b.serialNumber),
          },
          {
            key: 'ownerName',
            label: getColLabel('ownerName', 'اسم صاحب المخبز'),
            headerText: getColLabel('ownerName', 'اسم صاحب المخبز'),
            type: 'name',
            defaultWidth: 185,
            render: (b) => (
              <button
                type="button"
                onClick={() => handleOpenAction(b, 'details')}
                className="font-extrabold text-[#102A43] hover:text-[#164E83] hover:underline text-right cursor-pointer"
              >
                {b.ownerName}
              </button>
            ),
          },
          {
            key: 'posNumber',
            label: getColLabel('posNumber', 'رقم ماكينة POS'),
            headerText: getColLabel('posNumber', 'رقم ماكينة POS'),
            type: 'numeric',
            align: 'center',
            defaultWidth: 130,
            measureValue: (b) => toArabicNumerals(b.posNumber),
            render: (b) => (
              <button
                type="button"
                onClick={() => handleOpenAction(b, 'details')}
                title="اضغط لفتح ملف المخبز"
                className="num-cell font-black px-2 py-0.5 rounded bg-slate-100 hover:bg-[#102A43] hover:text-white text-[#102A43] transition-colors cursor-pointer"
              >
                {toArabicNumerals(b.posNumber)}
              </button>
            ),
          },
          {
            key: 'name',
            label: getColLabel('name', 'اسم المخبز'),
            headerText: getColLabel('name', 'اسم المخبز'),
            type: 'name',
            defaultWidth: 180,
            render: (b) => (
              <button
                type="button"
                onClick={() => handleOpenAction(b, 'details')}
                className="font-extrabold text-[#164E83] hover:underline text-right cursor-pointer"
              >
                {b.name}
              </button>
            ),
          },
          {
            key: 'managerName',
            label: getColLabel('managerName', 'المدير المسؤول'),
            headerText: getColLabel('managerName', 'المدير المسؤول'),
            type: 'name',
            defaultWidth: 165,
            render: (b) => <span className="text-slate-700">{b.managerName || '—'}</span>,
          },
          {
            key: 'ownerNationalId',
            label: getColLabel('ownerNationalId', 'الرقم القومي'),
            headerText: getColLabel('ownerNationalId', 'الرقم القومي'),
            type: 'numeric',
            align: 'center',
            defaultWidth: 145,
            measureValue: (b) => toArabicNumerals(b.ownerNationalId),
            render: (b) => toArabicNumerals(b.ownerNationalId),
          },
          {
            key: 'phone',
            label: getColLabel('phone', 'رقم الهاتف'),
            headerText: getColLabel('phone', 'رقم الهاتف'),
            type: 'numeric',
            align: 'center',
            defaultWidth: 130,
            measureValue: (b) => toArabicNumerals(b.phone),
            render: (b) => <span className="font-extrabold text-[#164E83]">{toArabicNumerals(b.phone)}</span>,
          },
          {
            key: 'village',
            label: getColLabel('village', 'القرية'),
            headerText: getColLabel('village', 'القرية'),
            type: 'text',
            defaultWidth: 130,
            render: (b) => <span className="text-slate-700">{b.village}</span>,
          },
          {
            key: 'actions',
            label: 'الإجراءات',
            headerText: 'الإجراءات',
            type: 'actions',
            align: 'center',
            sortable: false,
            defaultWidth: 185,
            render: (b) => renderActionsMenu(b),
          },
        ];

        return (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-3">
            <div className="p-4 bg-[#102A43] text-white rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-[13px] font-black flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C6A15B]" />
                  <span>دليل أصحاب المخابز والمديرين المسؤولين</span>
                </h2>
                <p className="text-[10.5px] text-slate-300 font-bold">بيانات التواصل والرقم القومي وأرقام ماكينات الصرف المرتبطة بكل مالك</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={ownersSearch}
                  onChange={(e) => setOwnersSearch(e.target.value)}
                  placeholder="بحث باسم المالك، رقم ماكينة POS، الهاتف أو القرية..."
                  className="w-full pr-9 pl-3 py-2 bg-white text-[#102A43] rounded-lg text-[11px] font-bold"
                />
              </div>
            </div>

            <SmartAutoFitTable
              tableId="bakery_owners"
              userId={currentUser.id}
              rows={filteredOwners}
              totalCount={activeBakeriesList.length}
              getRowId={(b) => b.id}
              columns={ownerColumns}
              sortKey={ownersSort.key}
              sortAsc={ownersSort.asc}
              onSort={(k) => setOwnersSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
              selectable
              selectedIds={selectedBakeryIds}
              onToggleSelect={toggleSelectBakery}
              onClearSelection={() => setSelectedBakeryIds([])}
              pinnedKeys={Array.from(new Set([...subPinnedCols, 'ownerName', 'posNumber']))}
              onTogglePinColumn={toggleSubPin}
              onPinAll={() => setSubPinnedCols(['ownerName', 'posNumber', 'name'])}
              onUnpinAll={() => setSubPinnedCols([])}
              onResetPinDefaults={() => setSubPinnedCols(['ownerName', 'posNumber'])}
              onOpenHeaderCustomizer={() => setShowColumnModal(true)}
              onNotify={showToast}
              theadClassName="bg-slate-100 text-[#102A43] border-b border-slate-300"
            />
          </div>
        );
      })()}

      {/* =====================================================================
          2C. القرى والوحدات المحلية (Group 1)
         ===================================================================== */}
      {activeSubTab === 'villages' && (() => {
        const villageColumns: SmartTableColumn<(typeof villagesSummary)[number]>[] = [
          {
            key: 'village',
            label: 'القرية',
            headerText: 'القرية',
            type: 'text',
            defaultWidth: 145,
            render: (row) => <span className="font-extrabold text-[#102A43]">{row.village}</span>,
          },
          {
            key: 'localUnit',
            label: 'الوحدة المحلية',
            headerText: 'الوحدة المحلية',
            type: 'name',
            defaultWidth: 185,
            render: (row) => <span className="text-slate-700">{row.localUnit}</span>,
          },
          {
            key: 'count',
            label: 'إجمالي المخابز',
            headerText: 'إجمالي المخابز',
            type: 'numeric',
            align: 'center',
            defaultWidth: 115,
            measureValue: (row) => formatArabicNumber(row.count),
            render: (row) => <span className="font-extrabold">{formatArabicNumber(row.count)}</span>,
          },
          {
            key: 'activeCount',
            label: 'النشطة',
            headerText: 'النشطة',
            type: 'numeric',
            align: 'center',
            defaultWidth: 95,
            measureValue: (row) => formatArabicNumber(row.activeCount),
            render: (row) => <span className="text-emerald-700 font-extrabold">{formatArabicNumber(row.activeCount)}</span>,
          },
          {
            key: 'totalActualQuota',
            label: 'إجمالي الحصص الفعلية',
            headerText: 'إجمالي الحصص الفعلية',
            type: 'numeric',
            align: 'center',
            defaultWidth: 155,
            measureValue: (row) => `${formatArabicNumber(row.totalActualQuota)} شيكارة`,
            render: (row) => <span className="font-extrabold text-[#164E83]">{formatArabicNumber(row.totalActualQuota)} شيكارة</span>,
          },
          {
            key: 'totalDailyLoaves',
            label: 'الأرغفة اليومية',
            headerText: 'الأرغفة اليومية',
            type: 'numeric',
            align: 'center',
            defaultWidth: 135,
            measureValue: (row) => formatArabicNumber(row.totalDailyLoaves),
            render: (row) => <span className="font-extrabold text-emerald-800">{formatArabicNumber(row.totalDailyLoaves)}</span>,
          },
          {
            key: 'totalBeneficiaries2025',
            label: 'المستفيدين ٢٠٢٥',
            headerText: 'المستفيدين ٢٠٢٥',
            type: 'numeric',
            align: 'center',
            defaultWidth: 135,
            measureValue: (row) => formatArabicNumber(row.totalBeneficiaries2025),
            render: (row) => formatArabicNumber(row.totalBeneficiaries2025),
          },
          {
            key: 'totalDebt',
            label: 'إجمالي المديونيات',
            headerText: 'إجمالي المديونيات',
            type: 'currency',
            align: 'center',
            defaultWidth: 145,
            measureValue: (row) => `${formatArabicNumber(row.totalDebt)} ج.م`,
            render: (row) => (
              <span className={`font-extrabold ${row.totalDebt > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {formatArabicNumber(row.totalDebt)} ج.م
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'استعراض',
            headerText: 'استعراض',
            type: 'actions',
            align: 'center',
            sortable: false,
            defaultWidth: 145,
            render: (row) => (
              <button
                type="button"
                onClick={() => {
                  setFilterVillage(row.village);
                  setCurrentPage(1);
                  setActiveSubTab('registry');
                  setActiveFocus('registry');
                }}
                className="px-3 py-1 bg-[#102A43] hover:bg-[#164E83] text-white rounded-lg text-[10.5px] font-extrabold cursor-pointer"
              >
                عرض مخابز القرية
              </button>
            ),
          },
        ];

        return (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-3">
            <div className="p-4 bg-[#102A43] text-white rounded-xl flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-black flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C6A15B]" />
                  <span>توزيع المخابز والحصص حسب القرى والوحدات المحلية</span>
                </h2>
                <p className="text-[10.5px] text-slate-300 font-bold">إحصائيات مجمعة لكل قرية مع إمكانية فتح مخابز القرية مباشرة في السجل</p>
              </div>
              <span className="num-cell text-[11px] text-[#C6A15B] font-extrabold">{formatArabicNumber(villagesSummary.length)} قرية مسجلة</span>
            </div>

            <SmartAutoFitTable
              tableId="bakery_villages"
              userId={currentUser.id}
              rows={villagesSummary}
              totalCount={villagesSummary.length}
              getRowId={(r) => r.village}
              columns={villageColumns}
              sortKey={villagesSort.key}
              sortAsc={villagesSort.asc}
              onSort={(k) => setVillagesSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
              pinnedKeys={subPinnedCols}
              onTogglePinColumn={toggleSubPin}
              onPinAll={() => setSubPinnedCols(['village'])}
              onUnpinAll={() => setSubPinnedCols([])}
              onResetPinDefaults={() => setSubPinnedCols(['village'])}
              onNotify={showToast}
              theadClassName="bg-slate-100 text-[#102A43] border-b border-slate-300"
            />
          </div>
        );
      })()}

      {/* =====================================================================
          4B. منظومة الرقابة والتفتيش (Group 4)
         ===================================================================== */}
      {activeSubTab === 'inspection' && (
        <BakeryInspectionModule
          bakeries={activeBakeriesList}
          inspections={inspections}
          currentUser={currentUser}
          activeFocus={activeFocus}
          todayRef={todayRef}
          onAddInspection={handleAddInspection}
          onUpdateStatus={handleUpdateInspectionStatus}
          onSelectBakeryDetails={(b) => handleOpenAction(b, 'details')}
        />
      )}

      {/* =====================================================================
          5B. منظومة المديونيات والحسابات (Group 5)
         ===================================================================== */}
      {activeSubTab === 'debts' && (
        <BakeryDebtsModule
          userId={currentUser.id}
          currentUser={currentUser}
          bakeries={activeBakeriesList}
          transactions={debtTransactions}
          activeFocus={activeFocus}
          selectedStatementBakeryId={selectedStatementBakeryId}
          todayRef={todayRef}
          onSelectStatementBakeryId={(id) => {
            setSelectedStatementBakeryId(id);
            setActiveFocus('dbt-statement');
          }}
          onAddTransaction={handleAddDebtTransaction}
          onSelectBakeryDetails={(b) => handleOpenAction(b, 'details')}
        />
      )}

      {/* =====================================================================
          3. إضافة مخبز جديد / تعديل مخبز — 7 خطوات منظمة (Section 4)
         ===================================================================== */}
      {activeSubTab === 'add' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <h2 className="text-xl font-black text-[#102A43]">
                {editingBakeryId ? `تعديل بيانات المخبز: ${formBakery.name}` : 'إضافة مخبز جديد — إدارة تموين مركز المحلة الكبرى'}
              </h2>
              <p className="text-[11px] font-bold text-slate-600">
                نموذج قياسي من ٧ خطوات مع التحقق الإلكتروني القياسي للرقم القومي (١٤ رقماً) والهاتف (١١ رقماً) والربط التلقائي للقرية بالوحدة المحلية
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingBakeryId(null);
                setActiveSubTab('registry');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-extrabold self-start cursor-pointer"
            >
              إلغاء والعودة للسجل
            </button>
          </div>

          {/* 7-Step Indicator */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { s: 1, label: '١. البيانات والموقع' },
              { s: 2, label: '٢. صاحب المخبز' },
              { s: 3, label: '٣. التشغيل والتصنيف' },
              { s: 4, label: '٤. الحصص والتأمين' },
              { s: 5, label: '٥. السكان والمتوسطات' },
              { s: 6, label: '٦. التراخيص والعقود' },
              { s: 7, label: '٧. المراجعة والحفظ' },
            ].map((item) => (
              <button
                key={item.s}
                type="button"
                onClick={() => {
                  if (item.s < wizardStep) setWizardStep(item.s as 1 | 2 | 3 | 4 | 5 | 6 | 7);
                }}
                className={`p-2.5 rounded-xl text-[11px] font-extrabold border text-center transition-all ${
                  wizardStep === item.s
                    ? 'bg-[#102A43] text-white border-[#102A43] shadow-xs'
                    : wizardStep > item.s
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 cursor-pointer'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {wizardError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-[11px] font-extrabold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{wizardError}</span>
            </div>
          )}

          <form onSubmit={wizardStep === 7 ? handleWizardSave : (e) => { e.preventDefault(); handleWizardNext(); }} className="space-y-6">
            {/* الخطوة الأولى: البيانات الأساسية والموقع */}
            {wizardStep === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">رقم المخبز الرسمي (فريد) *</label>
                  <input
                    type="text"
                    required
                    value={formBakery.bakeryNumber || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, bakeryNumber: e.target.value })}
                    placeholder="مثال: ١٢٩٠"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">رقم ماكينة الصرف (فريد) *</label>
                  <input
                    type="text"
                    required
                    value={formBakery.posNumber || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, posNumber: e.target.value })}
                    placeholder="مثال: ٨٨٤٩٠٠"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">اسم المخبز *</label>
                  <input
                    type="text"
                    required
                    value={formBakery.name || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, name: e.target.value })}
                    placeholder="مثال: مخبز الأمل الآلي"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">القرية (تربط الوحدة المحلية تلقائياً) *</label>
                  <select
                    value={formBakery.village || liveVillages[0] || 'صفط تراب'}
                    onChange={(e) => handleWizardVillageChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-extrabold"
                  >
                    {Array.from(
                      new Set([
                        ...(formBakery.village ? [formBakery.village] : []),
                        ...liveVillages,
                      ])
                    ).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">الوحدة المحلية التابعة للقرية المختارة *</label>
                  <select
                    value={formBakery.localUnit || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, localUnit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-extrabold text-[#164E83]"
                  >
                    {Array.from(
                      new Set([
                        ...(formBakery.localUnit ? [formBakery.localUnit] : []),
                        ...getActiveLocalUnitsForVillage(formBakery.village || liveVillages[0] || ''),
                      ])
                    ).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">حالة النشاط</label>
                  <select
                    value={formBakery.activityStatus || 'نشط'}
                    onChange={(e) => setFormBakery({ ...formBakery, activityStatus: e.target.value as BakeryRecord['activityStatus'] })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-extrabold"
                  >
                    <option value="نشط">نشط</option>
                    <option value="متوقف">متوقف</option>
                    <option value="تحت الفحص">تحت الفحص</option>
                    <option value="مغلق إدارياً">مغلق إدارياً</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">العنوان التفصيلي *</label>
                  <input
                    type="text"
                    required
                    value={formBakery.address || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, address: e.target.value })}
                    placeholder="الشارع والمعلم البارز والقرية - مركز المحلة الكبرى"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  />
                </div>
              </div>
            )}

            {/* الخطوة الثانية: بيانات صاحب المخبز والتواصل */}
            {wizardStep === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">اسم صاحب المخبز / المستغل الرباعي *</label>
                  <input
                    type="text"
                    required
                    value={formBakery.ownerName || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, ownerName: e.target.value })}
                    placeholder="الاسم الرباعي كاملاً"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">الرقم القومي لصاحب المخبز (١٤ رقماً) *</label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={formBakery.ownerNationalId || ''}
                    onChange={(e) =>
                      setFormBakery({
                        ...formBakery,
                        ownerNationalId: e.target.value.replace(/\D/g, '').slice(0, 14),
                      })
                    }
                    placeholder="٢٧٥٠٠٠٠٠٠٠٠٠٠٠"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono tracking-widest"
                  />
                  <span className="text-xs font-bold text-slate-600 mt-1 block">
                    عدد الأرقام المدخلة: {toArabicNumerals(formBakery.ownerNationalId?.length || 0)} / ١٤
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">رقم الهاتف المحمول (١١ رقماً) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    value={formBakery.phone || ''}
                    onChange={(e) =>
                      setFormBakery({
                        ...formBakery,
                        phone: e.target.value.replace(/\D/g, '').slice(0, 11),
                      })
                    }
                    placeholder="٠١٠٠٠٠٠٠٠٠٠"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono tracking-widest"
                  />
                  <span className="text-xs font-bold text-slate-600 mt-1 block">
                    عدد الأرقام المدخلة: {toArabicNumerals(formBakery.phone?.length || 0)} / ١١
                  </span>
                </div>
              </div>
            )}

            {/* الخطوة الثالثة: بيانات التشغيل والتصنيف */}
            {wizardStep === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">نوع الخبز ومعامل الإنتاج</label>
                  <select
                    value={formBakery.breadType || 'بلدي مدعم (ماو)'}
                    onChange={(e) => {
                      const bType = e.target.value as BakeryRecord['breadType'];
                      const factor: 660 | 725 = bType.includes('ملدن') ? 725 : 660;
                      setFormBakery({ ...formBakery, breadType: bType, productionFactor: factor });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-extrabold"
                  >
                    <option value="بلدي مدعم (ماو)">بلدي مدعم (ماو — معامل ٦٦٠)</option>
                    <option value="بلدي مدعم (ملدن)">بلدي مدعم (ملدن — معامل ٧٢٥)</option>
                    <option value="طباقي">طباقي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">معامل إنتاج الخبز المعتمد</label>
                  <select
                    value={formBakery.productionFactor || 660}
                    onChange={(e) =>
                      setFormBakery({ ...formBakery, productionFactor: Number(e.target.value) === 725 ? 725 : 660 })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-mono font-extrabold"
                  >
                    <option value={660}>٦٦٠ رغيف لكل شيكارة</option>
                    <option value={725}>٧٢٥ رغيف لكل شيكارة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">نوع خط الإنتاج</label>
                  <select
                    value={formBakery.productionLineType || 'آلي كامل'}
                    onChange={(e) =>
                      setFormBakery({ ...formBakery, productionLineType: e.target.value as BakeryRecord['productionLineType'] })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  >
                    <option value="آلي كامل">آلي كامل</option>
                    <option value="نصف آلي">نصف آلي</option>
                    <option value="يدوي مطور">يدوي مطور</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">نوع الوقود</label>
                  <select
                    value={formBakery.fuelType || 'غاز طبيعي'}
                    onChange={(e) => setFormBakery({ ...formBakery, fuelType: e.target.value as BakeryRecord['fuelType'] })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  >
                    <option value="غاز طبيعي">غاز طبيعي</option>
                    <option value="سولار">سولار</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">تصنيف المخبز</label>
                  <select
                    value={formBakery.bakeryCategory || 'نموذجي'}
                    onChange={(e) =>
                      setFormBakery({ ...formBakery, bakeryCategory: e.target.value as BakeryRecord['bakeryCategory'] })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  >
                    <option value="ممتاز أ">ممتاز أ</option>
                    <option value="نموذجي">نموذجي</option>
                    <option value="عادي">عادي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">الطاقة الإنتاجية اليومية (شيكارة)</label>
                  <input
                    type="number"
                    value={formBakery.dailyCapacitySacks || 30}
                    onChange={(e) => setFormBakery({ ...formBakery, dailyCapacitySacks: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                  />
                </div>
              </div>
            )}

            {/* الخطوة الرابعة: الحصص والتأمين */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">المبلغ التأميني المسدد (ج.م) [يدوي]</label>
                    <input
                      type="number"
                      value={formBakery.insuranceAmountEgp || 0}
                      onChange={(e) => setFormBakery({ ...formBakery, insuranceAmountEgp: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-mono font-extrabold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">الحصة الفعلية اليومية (شيكارة) [يدوي]</label>
                    <input
                      type="number"
                      value={formBakery.actualQuota || 0}
                      onChange={(e) =>
                        setFormBakery({
                          ...formBakery,
                          actualQuota: Number(e.target.value),
                          dailySacksCount: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-mono font-extrabold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">المتبقي أو المديونية على المخبز (ج.م)</label>
                    <input
                      type="number"
                      value={formBakery.remainingDebtEgp || 0}
                      onChange={(e) => setFormBakery({ ...formBakery, remainingDebtEgp: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                    />
                  </div>
                </div>

                {/* Live Equations 1 & 2 Box */}
                <div className="bg-[#F4F7FB] p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-extrabold text-slate-600 block">
                      المعادلة الأولى (تلقائي): الحصة التأمينية = المبلغ التأميني ÷ ٢٣٥ ÷ ٣
                    </span>
                    <span className="num-cell text-lg font-black text-[#102A43]">
                      {formatArabicDecimal(liveWizardPreview.insuranceQuota, 3)} شيكارة
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-600 block">
                      المعادلة الثانية (تلقائي): الأرغفة اليومية = الحصة الفعلية × {formatArabicNumber(formBakery.productionFactor)}
                    </span>
                    <span className="num-cell text-lg font-black text-emerald-800">
                      {formatArabicNumber(liveWizardPreview.dailyLoavesCount)} رغيف / يوم
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* الخطوة الخامسة: السكان والمستفيدون والمتوسطات */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">عدد سكان القرية</label>
                    <input
                      type="number"
                      value={formBakery.villagePopulation || 0}
                      onChange={(e) => setFormBakery({ ...formBakery, villagePopulation: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">عدد المستفيدين لعام ٢٠٢٣</label>
                    <input
                      type="number"
                      value={formBakery.beneficiaries2023 || 0}
                      onChange={(e) => setFormBakery({ ...formBakery, beneficiaries2023: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">عدد المستفيدين لعام ٢٠٢٤</label>
                    <input
                      type="number"
                      value={formBakery.beneficiaries2024 || 0}
                      onChange={(e) => setFormBakery({ ...formBakery, beneficiaries2024: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">عدد المستفيدين لعام ٢٠٢٥</label>
                    <input
                      type="number"
                      value={formBakery.beneficiaries2025 || 0}
                      onChange={(e) => setFormBakery({ ...formBakery, beneficiaries2025: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="bg-[#F4F7FB] p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div>
                    <span className="text-xs font-extrabold text-slate-600 block">متوسط ٢٠٢٣ (م٣)</span>
                    <span className="num-cell text-base font-black text-[#102A43]">
                      {formatArabicDecimal(liveWizardPreview.avgPerCapita2023, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-600 block">متوسط ٢٠٢٤ (م٤)</span>
                    <span className="num-cell text-base font-black text-[#102A43]">
                      {formatArabicDecimal(liveWizardPreview.avgPerCapita2024, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-600 block">متوسط ٢٠٢٥ (م٥)</span>
                    <span className="num-cell text-base font-black text-[#102A43]">
                      {formatArabicDecimal(liveWizardPreview.avgPerCapita2025, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-600 block">الفرق التراكمي (م٦)</span>
                    <span className="num-cell text-base font-black text-amber-800">
                      {formatArabicDecimal(liveWizardPreview.cumulativeAvgDifference, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-600 block">نصيب الفرد الفعلي (م٧)</span>
                    <span className="num-cell text-base font-black text-emerald-800">
                      {formatArabicDecimal(liveWizardPreview.dailyShareActual2025, 2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* الخطوة السادسة: التراخيص والعقود */}
            {wizardStep === 6 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">رقم رخصة المخبز</label>
                  <input
                    type="text"
                    value={formBakery.licenseNumber || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, licenseNumber: e.target.value })}
                    placeholder="ر.م/٠٠٠٠/محلة"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">تاريخ انتهاء الرخصة</label>
                  <input
                    type="date"
                    value={formBakery.licenseExpiryDate || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, licenseExpiryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">رقم البطاقة الضريبية</label>
                  <input
                    type="text"
                    value={formBakery.taxCardNumber || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, taxCardNumber: e.target.value })}
                    placeholder="٠٠٠-٠٠٠-٠٠٠"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">تاريخ انتهاء البطاقة الضريبية</label>
                  <input
                    type="date"
                    value={formBakery.taxCardExpiryDate || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, taxCardExpiryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">رقم عقد الإيجار / الملكية</label>
                  <input
                    type="text"
                    value={formBakery.leaseContractNumber || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, leaseContractNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">تاريخ انتهاء العقد</label>
                  <input
                    type="date"
                    value={formBakery.leaseExpiryDate || ''}
                    onChange={(e) => setFormBakery({ ...formBakery, leaseExpiryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold font-mono"
                  />
                </div>
              </div>
            )}

            {/* الخطوة السابعة: المراجعة والحفظ */}
            {wizardStep === 7 && (
              <div className="bg-[#F4F7FB] p-5 rounded-2xl border border-slate-200 space-y-3 text-[11px] font-bold">
                <h4 className="font-black text-[13px] text-[#102A43] border-b border-slate-200 pb-2">
                  ملخص مراجعة بيانات المخبز قبل الحفظ النهائي في قاعدة البيانات
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><span className="text-slate-600">اسم المخبز:</span> <strong className="text-[#102A43]">{formBakery.name}</strong></div>
                  <div><span className="text-slate-600">رقم المخبز / ماكينة الصرف:</span> <strong className="num-cell">{toArabicNumerals(formBakery.bakeryNumber)} / {toArabicNumerals(formBakery.posNumber)}</strong></div>
                  <div><span className="text-slate-600">القرية والوحدة:</span> <strong>{formBakery.village} ({formBakery.localUnit})</strong></div>
                  <div><span className="text-slate-600">صاحب المخبز:</span> <strong>{formBakery.ownerName}</strong></div>
                  <div><span className="text-slate-600">الرقم القومي:</span> <strong className="num-cell">{toArabicNumerals(formBakery.ownerNationalId)}</strong></div>
                  <div><span className="text-slate-600">الحصة الفعلية والأرغفة:</span> <strong className="num-cell text-emerald-800">{formatArabicNumber(liveWizardPreview.actualQuota)} شيكارة ({formatArabicNumber(liveWizardPreview.dailyLoavesCount)} رغيف)</strong></div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-[11px] cursor-pointer"
                >
                  الخطوة السابقة
                </button>
              ) : (
                <div></div>
              )}

              {wizardStep < 7 ? (
                <button
                  type="button"
                  onClick={handleWizardNext}
                  className="px-6 py-2.5 bg-[#102A43] hover:bg-[#164E83] text-white font-extrabold rounded-xl text-[11px] cursor-pointer"
                >
                  الخطوة التالية
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-7 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-[11px] flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ بيانات المخبز واعتماد المعادلات</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          4. نظام الحصص والمعادلات الحسابية السبع (Section 5)
         ===================================================================== */}
      {activeSubTab === 'quotas' && (
        <div className="space-y-5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[#102A43]">
                {activeFocus === 'quotas-insurance'
                  ? 'الحصص التأمينية والمبالغ المودعة — المعادلة الأولى المعتمدة'
                  : activeFocus === 'quotas-actual'
                  ? 'الحصص الفعلية المنصرفة للمخابز — متابعة الصرف اليومي'
                  : activeFocus === 'quotas-loaves'
                  ? 'حساب الأرغفة اليومية ومعاملات الإنتاج (٦٦٠ ماو / ٧٢٥ ملدن)'
                  : 'نظام الحصص التموينية والمعادلات الحسابية السبع المعتمدة'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تاريخ آخر إعادة حساب شاملة: <span className="font-bold text-[#164E83]">{formatDateArabic(lastRecalc, true)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleRecalculateAllBakeries}
              className="px-4 py-2 bg-[#102A43] hover:bg-[#164E83] text-white rounded-xl text-xs font-bold flex items-center gap-2 self-start cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-[#C6A15B]" />
              <span>إعادة حساب جميع المخابز الآن</span>
            </button>
          </div>

          {/* 7 Formula Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              {
                num: 'المعادلة الأولى (١)',
                title: 'حساب الحصة التأمينية',
                formula: 'الحصة التأمينية = المبلغ التأميني ÷ ٢٣٥ ÷ ٣',
                source: 'مدخل يدوي: المبلغ التأميني بالجنيه | ثابت: سعر الشيكارة ٢٣٥ × ٣ أيام',
                result: `${formatArabicDecimal(kpiStats.totalInsuranceQuota, 3)} شيكارة`,
              },
              {
                num: 'المعادلة الثانية (٢)',
                title: 'حساب الأرغفة اليومية',
                formula: 'عدد الأرغفة اليومية = الحصة الفعلية × معامل الإنتاج (٦٦٠ أو ٧٢٥)',
                source: 'مدخل يدوي: الحصة الفعلية | معامل ٦٦٠ (ماو) أو ٧٢٥ (ملدن)',
                result: `${formatArabicNumber(kpiStats.totalDailyLoaves)} رغيف يومياً`,
              },
              {
                num: 'المعادلة الثالثة (٣)',
                title: 'متوسط نصيب الفرد لعام ٢٠٢٣',
                formula: 'متوسط ٢٠٢٣ = عدد الأرغفة اليومية ÷ عدد المستفيدين لعام ٢٠٢٣',
                source: 'ناتج المعادلة (٢) ÷ مدخل مستفيدي ٢٠٢٣ (تقريب رقمين عشريين)',
                result: `${formatArabicDecimal(kpiStats.avg2023, 2)} رغيف / فرد`,
              },
              {
                num: 'المعادلة الرابعة (٤)',
                title: 'متوسط نصيب الفرد لعام ٢٠٢٤',
                formula: 'متوسط ٢٠٢٤ = عدد الأرغفة اليومية ÷ عدد المستفيدين لعام ٢٠٢٤',
                source: 'ناتج المعادلة (٢) ÷ مدخل مستفيدي ٢٠٢٤ (تقريب رقمين عشريين)',
                result: `${formatArabicDecimal(kpiStats.avg2024, 2)} رغيف / فرد`,
              },
              {
                num: 'المعادلة الخامسة (٥)',
                title: 'متوسط نصيب الفرد لعام ٢٠٢٥',
                formula: 'متوسط ٢٠٢٥ = عدد الأرغفة اليومية ÷ عدد المستفيدين لعام ٢٠٢٥',
                source: 'ناتج المعادلة (٢) ÷ مدخل مستفيدي ٢٠٢٥ (تقريب رقمين عشريين)',
                result: `${formatArabicDecimal(kpiStats.avg2025, 2)} رغيف / فرد`,
              },
              {
                num: 'المعادلة السادسة (٦)',
                title: 'الفرق التراكمي بين المتوسطات',
                formula: 'الفرق التراكمي = متوسط ٢٠٢٣ − متوسط ٢٠٢٤ − متوسط ٢٠٢٥',
                source: 'معادلة فرق حسابية مجردة دون تصنيف تلقائي إلا بعد الاعتماد الإداري',
                result: formatArabicDecimal(round3(kpiStats.avg2023 - kpiStats.avg2024 - kpiStats.avg2025), 2),
              },
              {
                num: 'المعادلة السابعة (٧)',
                title: 'نصيب الفرد وفق الحصة الفعلية ٢٠٢٥',
                formula: 'نصيب الفرد اليومي ٢٠٢٥ = عدد الأرغفة اليومية ÷ مستفيدي ٢٠٢٥',
                source: 'تعرض بصورة مستقلة في لوحة التحليل ولا تحتسب مرتين ضمن إجمالي الإنتاج',
                result: `${formatArabicDecimal(kpiStats.avg2025, 2)} رغيف / مستفيد`,
              },
            ].map((eq, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-[#C6A15B] bg-[#102A43] px-2 py-0.5 rounded inline-block mb-1.5">
                    {eq.num}
                  </span>
                  <h3 className="text-xs font-black text-[#102A43] mb-1.5">{eq.title}</h3>
                  <div className="p-2 bg-[#F4F7FB] rounded-xl border border-slate-200 text-[10px] font-bold text-[#164E83] mb-1.5">
                    {eq.formula}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{eq.source}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">النتيجة المعتمدة:</span>
                  <span className="text-xs font-black tabular-nums text-emerald-800">{eq.result}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Sortable & Auto-Fit Quotas & Equations Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-3">
            <div className="p-3.5 bg-[#102A43] text-white rounded-xl flex items-center justify-between">
              <h3 className="text-[12px] font-black">جدول تدقيق الحصص والمعادلات السبع لكل مخبز (مدخل يدوي مقابل ناتج تلقائي)</h3>
              <span className="text-[10.5px] text-[#C6A15B] font-bold">تقريب المتوسطات: رقمان عشريان · انقر على أي عمود للفرز</span>
            </div>

            <SmartAutoFitTable
              tableId="bakery_quotas"
              userId={currentUser.id}
              rows={activeBakeriesList}
              totalCount={activeBakeriesList.length}
              getRowId={(b) => b.id}
              columns={[
                {
                  key: 'name',
                  label: 'المخبز والقرية',
                  headerText: 'المخبز والقرية',
                  type: 'name',
                  defaultWidth: 195,
                  measureValue: (b) => `${b.name} (${b.village})`,
                  render: (b) => (
                    <span className="font-extrabold text-[#102A43]">
                      {b.name} <span className="text-slate-600 font-bold">({b.village})</span>
                    </span>
                  ),
                },
                {
                  key: 'insuranceAmountEgp',
                  label: 'المبلغ التأميني',
                  headerText: 'المبلغ التأميني',
                  type: 'currency',
                  align: 'center',
                  defaultWidth: 130,
                  measureValue: (b) => `${formatArabicNumber(b.insuranceAmountEgp)} ج.م`,
                  render: (b) => `${formatArabicNumber(b.insuranceAmountEgp)} ج.م`,
                },
                {
                  key: 'insuranceQuota',
                  label: 'الحصة التأمينية',
                  headerText: 'الحصة التأمينية',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 115,
                  measureValue: (b) => formatArabicDecimal(b.insuranceQuota, 3),
                  render: (b) => <span className="font-extrabold text-[#164E83]">{formatArabicDecimal(b.insuranceQuota, 3)}</span>,
                },
                {
                  key: 'actualQuota',
                  label: 'الحصة الفعلية',
                  headerText: 'الحصة الفعلية',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 105,
                  measureValue: (b) => formatArabicNumber(b.actualQuota),
                  render: (b) => <span className="font-extrabold text-[#102A43]">{formatArabicNumber(b.actualQuota)}</span>,
                },
                {
                  key: 'productionFactor',
                  label: 'المعامل',
                  headerText: 'المعامل',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 85,
                  measureValue: (b) => formatArabicNumber(b.productionFactor),
                  render: (b) => formatArabicNumber(b.productionFactor),
                },
                {
                  key: 'dailyLoavesCount',
                  label: 'الأرغفة اليومية',
                  headerText: 'الأرغفة اليومية',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 120,
                  measureValue: (b) => formatArabicNumber(b.dailyLoavesCount),
                  render: (b) => <span className="font-extrabold text-emerald-800">{formatArabicNumber(b.dailyLoavesCount)}</span>,
                },
                {
                  key: 'avgPerCapita2023',
                  label: <span className="flex flex-col items-center"><span>متوسط</span><span>٢٠٢٣</span></span>,
                  headerText: 'متوسط ٢٠٢٣',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 95,
                  measureValue: (b) => formatArabicDecimal(b.avgPerCapita2023, 2),
                  render: (b) => formatArabicDecimal(b.avgPerCapita2023, 2),
                },
                {
                  key: 'avgPerCapita2024',
                  label: <span className="flex flex-col items-center"><span>متوسط</span><span>٢٠٢٤</span></span>,
                  headerText: 'متوسط ٢٠٢٤',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 95,
                  measureValue: (b) => formatArabicDecimal(b.avgPerCapita2024, 2),
                  render: (b) => formatArabicDecimal(b.avgPerCapita2024, 2),
                },
                {
                  key: 'avgPerCapita2025',
                  label: <span className="flex flex-col items-center"><span>متوسط</span><span>٢٠٢٥</span></span>,
                  headerText: 'متوسط ٢٠٢٥',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 95,
                  measureValue: (b) => formatArabicDecimal(b.avgPerCapita2025, 2),
                  render: (b) => <span className="font-extrabold">{formatArabicDecimal(b.avgPerCapita2025, 2)}</span>,
                },
                {
                  key: 'cumulativeAvgDifference',
                  label: 'الفرق التراكمي',
                  headerText: 'الفرق التراكمي',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 115,
                  measureValue: (b) => formatArabicDecimal(b.cumulativeAvgDifference, 2),
                  render: (b) => <span className="text-amber-800 font-extrabold">{formatArabicDecimal(b.cumulativeAvgDifference, 2)}</span>,
                },
                {
                  key: 'dailyShareActual2025',
                  label: 'نصيب الفرد',
                  headerText: 'نصيب الفرد',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 105,
                  measureValue: (b) => formatArabicDecimal(b.dailyShareActual2025, 2),
                  render: (b) => <span className="text-emerald-800 font-extrabold">{formatArabicDecimal(b.dailyShareActual2025, 2)}</span>,
                },
                {
                  key: 'actions',
                  label: 'الإجراءات',
                  headerText: 'الإجراءات',
                  type: 'actions',
                  align: 'center',
                  sortable: false,
                  defaultWidth: 185,
                  render: (b) => renderActionsMenu(b),
                },
              ]}
              sortKey={quotasSort.key}
              sortAsc={quotasSort.asc}
              onSort={(k) => setQuotasSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
              selectable
              selectedIds={selectedBakeryIds}
              onToggleSelect={toggleSelectBakery}
              onClearSelection={() => setSelectedBakeryIds([])}
              pinnedKeys={subPinnedCols}
              onTogglePinColumn={toggleSubPin}
              onPinAll={() => setSubPinnedCols(['name'])}
              onUnpinAll={() => setSubPinnedCols([])}
              onResetPinDefaults={() => setSubPinnedCols(['name'])}
              onOpenHeaderCustomizer={() => setShowColumnModal(true)}
              onNotify={showToast}
              theadClassName="bg-slate-100 text-[#102A43] border-b border-slate-300"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          5. تحليل متوسطات المخابز 2023–2024–2025 والمستفيدين (Section 5)
         ===================================================================== */}
      {activeSubTab === 'averages' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-3">
          <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-black text-[#102A43]">
                {activeFocus === 'avg-beneficiaries'
                  ? 'إحصائيات المستفيدين ومقارنة النمو السنوي (٢٠٢٣ – ٢٠٢٤ – ٢٠٢٥)'
                  : 'شاشة التحليل المقارن لمتوسطات نصيب الفرد (٢٠٢٣ – ٢٠٢٤ – ٢٠٢٥)'}
              </h2>
              <p className="text-[11px] font-bold text-slate-600">
                تحليل التغير في أعداد المستفيدين ونصيب الفرد اليومي والفرق الحسابي التراكمي لكل مخبز مع فرز رقمي حقيقي
              </p>
            </div>
            <span className="text-[10.5px] font-extrabold text-[#164E83] bg-[#F4F7FB] px-3 py-1.5 rounded-xl border border-slate-200">
              المعادلة السابعة معروضة بصورة مستقلة دون ازدواج في إجمالي الإنتاج
            </span>
          </div>

          <SmartAutoFitTable
            tableId="bakery_averages"
            userId={currentUser.id}
            rows={averagesRows}
            totalCount={activeBakeriesList.length}
            getRowId={(b) => b.id}
            columns={[
              {
                key: 'name',
                label: 'المخبز والقرية',
                headerText: 'المخبز والقرية',
                type: 'name',
                defaultWidth: 195,
                measureValue: (b) => `${b.name} — ${b.village}`,
                render: (b) => (
                  <span className="font-extrabold text-[#102A43]">
                    {b.name} — <span className="text-slate-600 font-bold">{b.village}</span>
                  </span>
                ),
              },
              {
                key: 'dailyLoavesCount',
                label: 'الأرغفة اليومية',
                headerText: 'الأرغفة اليومية',
                type: 'numeric',
                align: 'center',
                defaultWidth: 120,
                measureValue: (b) => formatArabicNumber(b.dailyLoavesCount),
                render: (b) => <span className="font-extrabold">{formatArabicNumber(b.dailyLoavesCount)}</span>,
              },
              {
                key: 'beneficiaries2023',
                label: <span className="flex flex-col items-center"><span>المستفيدين</span><span className="text-[#C6A15B]">٢٠٢٣</span></span>,
                headerText: 'المستفيدين ٢٠٢٣',
                type: 'numeric',
                align: 'center',
                defaultWidth: 105,
                measureValue: (b) => formatArabicNumber(b.beneficiaries2023),
                render: (b) => formatArabicNumber(b.beneficiaries2023),
              },
              {
                key: 'avgPerCapita2023',
                label: <span className="flex flex-col items-center"><span>متوسط</span><span className="text-[#C6A15B]">٢٠٢٣</span></span>,
                headerText: 'متوسط ٢٠٢٣',
                type: 'numeric',
                align: 'center',
                defaultWidth: 95,
                measureValue: (b) => formatArabicDecimal(b.avgPerCapita2023, 2),
                render: (b) => <span className="font-extrabold text-[#164E83]">{formatArabicDecimal(b.avgPerCapita2023, 2)}</span>,
              },
              {
                key: 'beneficiaries2024',
                label: <span className="flex flex-col items-center"><span>المستفيدين</span><span className="text-[#C6A15B]">٢٠٢٤</span></span>,
                headerText: 'المستفيدين ٢٠٢٤',
                type: 'numeric',
                align: 'center',
                defaultWidth: 105,
                measureValue: (b) => formatArabicNumber(b.beneficiaries2024),
                render: (b) => formatArabicNumber(b.beneficiaries2024),
              },
              {
                key: 'avgPerCapita2024',
                label: <span className="flex flex-col items-center"><span>متوسط</span><span className="text-[#C6A15B]">٢٠٢٤</span></span>,
                headerText: 'متوسط ٢٠٢٤',
                type: 'numeric',
                align: 'center',
                defaultWidth: 95,
                measureValue: (b) => formatArabicDecimal(b.avgPerCapita2024, 2),
                render: (b) => <span className="font-extrabold text-[#164E83]">{formatArabicDecimal(b.avgPerCapita2024, 2)}</span>,
              },
              {
                key: 'beneficiaries2025',
                label: <span className="flex flex-col items-center"><span>المستفيدين</span><span className="text-[#C6A15B]">٢٠٢٥</span></span>,
                headerText: 'المستفيدين ٢٠٢٥',
                type: 'numeric',
                align: 'center',
                defaultWidth: 105,
                measureValue: (b) => formatArabicNumber(b.beneficiaries2025),
                render: (b) => formatArabicNumber(b.beneficiaries2025),
              },
              {
                key: 'avgPerCapita2025',
                label: <span className="flex flex-col items-center"><span>متوسط</span><span className="text-[#C6A15B]">٢٠٢٥</span></span>,
                headerText: 'متوسط ٢٠٢٥',
                type: 'numeric',
                align: 'center',
                defaultWidth: 95,
                measureValue: (b) => formatArabicDecimal(b.avgPerCapita2025, 2),
                render: (b) => <span className="font-extrabold text-[#102A43]">{formatArabicDecimal(b.avgPerCapita2025, 2)}</span>,
              },
              {
                key: 'diff24_23',
                label: 'فرق ٢٤−٢٣',
                headerText: 'فرق ٢٤−٢٣',
                type: 'numeric',
                align: 'center',
                defaultWidth: 95,
                measureValue: (b) => formatArabicDecimal(b.diff24_23, 2),
                render: (b) => formatArabicDecimal(b.diff24_23, 2),
              },
              {
                key: 'diff25_24',
                label: 'فرق ٢٥−٢٤',
                headerText: 'فرق ٢٥−٢٤',
                type: 'numeric',
                align: 'center',
                defaultWidth: 95,
                measureValue: (b) => formatArabicDecimal(b.diff25_24, 2),
                render: (b) => formatArabicDecimal(b.diff25_24, 2),
              },
              {
                key: 'cumulativeAvgDifference',
                label: 'الفرق التراكمي',
                headerText: 'الفرق التراكمي',
                type: 'numeric',
                align: 'center',
                defaultWidth: 115,
                measureValue: (b) => formatArabicDecimal(b.cumulativeAvgDifference, 2),
                render: (b) => <span className="font-extrabold text-amber-800">{formatArabicDecimal(b.cumulativeAvgDifference, 2)}</span>,
              },
              {
                key: 'dailyShareActual2025',
                label: 'نصيب الفرد ٢٠٢٥',
                headerText: 'نصيب الفرد ٢٠٢٥',
                type: 'numeric',
                align: 'center',
                defaultWidth: 115,
                measureValue: (b) => formatArabicDecimal(b.dailyShareActual2025, 2),
                render: (b) => <span className="font-extrabold text-emerald-800">{formatArabicDecimal(b.dailyShareActual2025, 2)}</span>,
              },
              {
                key: 'actions',
                label: 'الإجراءات',
                headerText: 'الإجراءات',
                type: 'actions',
                align: 'center',
                sortable: false,
                defaultWidth: 185,
                render: (b) => renderActionsMenu(b),
              },
            ]}
            sortKey={averagesSort.key}
            sortAsc={averagesSort.asc}
            onSort={(k) => setAveragesSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
            selectable
            selectedIds={selectedBakeryIds}
            onToggleSelect={toggleSelectBakery}
            onClearSelection={() => setSelectedBakeryIds([])}
            pinnedKeys={subPinnedCols}
            onTogglePinColumn={toggleSubPin}
            onPinAll={() => setSubPinnedCols(['name'])}
            onUnpinAll={() => setSubPinnedCols([])}
            onResetPinDefaults={() => setSubPinnedCols(['name'])}
            onOpenHeaderCustomizer={() => setShowColumnModal(true)}
            onNotify={showToast}
          />
        </div>
      )}

      {/* =====================================================================
          6. التراخيص والسجلات التجارية والبطاقات الضريبية (Section 6)
         ===================================================================== */}
      {activeSubTab === 'licenses' && (
        <div className="space-y-4">
          {/* جدول تراخيص المخابز */}
          <div className={`bg-white rounded-2xl border overflow-hidden p-4 space-y-3 ${activeFocus === 'doc-licenses' ? 'border-[#102A43] ring-1 ring-[#102A43]/20' : 'border-slate-200'}`}>
            <div className="p-3.5 bg-[#102A43] text-white rounded-xl flex items-center justify-between">
              <h3 className="text-[12px] font-black">أولاً: جدول تراخيص تشغيل المخابز ومواعيد الانتهاء</h3>
              <span className="text-[10.5px] text-[#C6A15B] font-bold">حساب تلقائي للأيام المتبقية وفرز زمني ورقمي</span>
            </div>

            <SmartAutoFitTable
              tableId="bakery_licenses"
              userId={currentUser.id}
              rows={licenseRows}
              totalCount={activeBakeriesList.length}
              getRowId={(r) => r.id}
              columns={[
                {
                  key: 'name',
                  label: 'اسم المخبز',
                  headerText: 'اسم المخبز',
                  type: 'name',
                  defaultWidth: 195,
                  measureValue: (r) => `${r.name} (${r.village})`,
                  render: (r) => <span className="font-extrabold text-[#102A43]">{r.name} ({r.village})</span>,
                },
                {
                  key: 'ownerName',
                  label: 'اسم المالك',
                  headerText: 'اسم المالك',
                  type: 'name',
                  defaultWidth: 170,
                  render: (r) => r.ownerName,
                },
                {
                  key: 'licenseNumber',
                  label: 'رقم الترخيص',
                  headerText: 'رقم الترخيص',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 135,
                  measureValue: (r) => toArabicNumerals(r.licenseNumber || '—'),
                  render: (r) => <span className="font-extrabold">{toArabicNumerals(r.licenseNumber || '—')}</span>,
                },
                {
                  key: 'licenseExpiryDate',
                  label: 'تاريخ الانتهاء',
                  headerText: 'تاريخ الانتهاء',
                  type: 'date',
                  align: 'center',
                  defaultWidth: 130,
                  measureValue: (r) => formatDateArabic(r.licenseExpiryDate),
                  render: (r) => <span className="font-extrabold">{formatDateArabic(r.licenseExpiryDate)}</span>,
                },
                {
                  key: 'daysRemaining',
                  label: 'الأيام المتبقية',
                  headerText: 'الأيام المتبقية',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 115,
                  measureValue: (r) => (r.daysRemaining !== null ? `${formatArabicNumber(r.daysRemaining)} يوم` : '—'),
                  render: (r) => (
                    <span className="font-extrabold">
                      {r.daysRemaining !== null ? `${formatArabicNumber(r.daysRemaining)} يوم` : '—'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  label: 'حالة الترخيص',
                  headerText: 'حالة الترخيص',
                  type: 'badge',
                  align: 'center',
                  defaultWidth: 150,
                  render: (r) => renderExpiryStatusBadge(r.status, r.severity),
                },
                {
                  key: 'actions',
                  label: 'الإجراءات',
                  headerText: 'الإجراءات',
                  type: 'actions',
                  align: 'center',
                  sortable: false,
                  defaultWidth: 185,
                  render: (r) => renderActionsMenu(r.bakery),
                },
              ]}
              sortKey={licensesSort.key}
              sortAsc={licensesSort.asc}
              onSort={(k) => setLicensesSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
              selectable
              selectedIds={selectedBakeryIds}
              onToggleSelect={toggleSelectBakery}
              onClearSelection={() => setSelectedBakeryIds([])}
              pinnedKeys={subPinnedCols}
              onTogglePinColumn={toggleSubPin}
              onPinAll={() => setSubPinnedCols(['name'])}
              onUnpinAll={() => setSubPinnedCols([])}
              onResetPinDefaults={() => setSubPinnedCols(['name'])}
              onNotify={showToast}
              theadClassName="bg-slate-100 text-[#102A43] border-b border-slate-300"
            />
          </div>

          {/* جدول البطاقات الضريبية والسجلات التجارية */}
          <div className={`bg-white rounded-2xl border overflow-hidden p-4 space-y-3 ${activeFocus === 'doc-tax' || activeFocus === 'doc-commercial' ? 'border-[#164E83] ring-1 ring-[#164E83]/25' : 'border-slate-200'}`}>
            <div className="p-3.5 bg-[#164E83] text-white rounded-xl flex items-center justify-between">
              <h3 className="text-[12px] font-black">
                {activeFocus === 'doc-commercial'
                  ? 'ثانياً: جدول السجلات التجارية والبطاقات الضريبية'
                  : 'ثانياً: جدول البطاقات الضريبية والسجلات التجارية'}
              </h3>
              <span className="text-[10.5px] text-slate-200 font-bold">متابعة الصلاحية الضريبية والتجارية</span>
            </div>

            <SmartAutoFitTable
              tableId="bakery_tax_commercial"
              userId={currentUser.id}
              rows={taxRows}
              totalCount={activeBakeriesList.length}
              getRowId={(r) => r.id}
              columns={[
                {
                  key: 'name',
                  label: 'اسم المخبز',
                  headerText: 'اسم المخبز',
                  type: 'name',
                  defaultWidth: 180,
                  render: (r) => <span className="font-extrabold text-[#102A43]">{r.name}</span>,
                },
                {
                  key: 'commercialRegisterNumber',
                  label: 'السجل التجاري',
                  headerText: 'السجل التجاري',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 135,
                  measureValue: (r) => toArabicNumerals(r.commercialRegisterNumber || '—'),
                  render: (r) => toArabicNumerals(r.commercialRegisterNumber || '—'),
                },
                {
                  key: 'commercialRegisterExpiryDate',
                  label: 'انتهاء السجل',
                  headerText: 'انتهاء السجل',
                  type: 'date',
                  align: 'center',
                  defaultWidth: 125,
                  measureValue: (r) => formatDateArabic(r.commercialRegisterExpiryDate),
                  render: (r) => formatDateArabic(r.commercialRegisterExpiryDate),
                },
                {
                  key: 'taxCardNumber',
                  label: 'البطاقة الضريبية',
                  headerText: 'البطاقة الضريبية',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 140,
                  measureValue: (r) => toArabicNumerals(r.taxCardNumber || '—'),
                  render: (r) => <span className="font-extrabold">{toArabicNumerals(r.taxCardNumber || '—')}</span>,
                },
                {
                  key: 'taxCardExpiryDate',
                  label: 'انتهاء الضريبية',
                  headerText: 'انتهاء الضريبية',
                  type: 'date',
                  align: 'center',
                  defaultWidth: 125,
                  measureValue: (r) => formatDateArabic(r.taxCardExpiryDate),
                  render: (r) => <span className="font-extrabold">{formatDateArabic(r.taxCardExpiryDate)}</span>,
                },
                {
                  key: 'daysRemaining',
                  label: 'الأيام المتبقية',
                  headerText: 'الأيام المتبقية',
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 115,
                  measureValue: (r) => (r.daysRemaining !== null ? `${formatArabicNumber(r.daysRemaining)} يوم` : '—'),
                  render: (r) => (
                    <span className="font-extrabold">
                      {r.daysRemaining !== null ? `${formatArabicNumber(r.daysRemaining)} يوم` : '—'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  label: 'الحالة',
                  headerText: 'الحالة',
                  type: 'badge',
                  align: 'center',
                  defaultWidth: 150,
                  render: (r) => renderExpiryStatusBadge(r.status, r.severity),
                },
                {
                  key: 'actions',
                  label: 'الإجراءات',
                  headerText: 'الإجراءات',
                  type: 'actions',
                  align: 'center',
                  sortable: false,
                  defaultWidth: 185,
                  render: (r) => renderActionsMenu(r.bakery),
                },
              ]}
              sortKey={taxSort.key}
              sortAsc={taxSort.asc}
              onSort={(k) => setTaxSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
              pinnedKeys={subPinnedCols}
              onTogglePinColumn={toggleSubPin}
              onPinAll={() => setSubPinnedCols(['name'])}
              onUnpinAll={() => setSubPinnedCols([])}
              onResetPinDefaults={() => setSubPinnedCols(['name'])}
              onNotify={showToast}
              theadClassName="bg-slate-100 text-[#102A43] border-b border-slate-300"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          7. العقود والإيجارات (Section 6)
         ===================================================================== */}
      {activeSubTab === 'contracts' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-3">
          <div className="p-3.5 bg-[#102A43] text-white rounded-xl flex items-center justify-between">
            <h3 className="text-[12px] font-black">جدول العقود والإيجارات وسندات الملكية للمخابز</h3>
            <span className="text-[10.5px] text-[#C6A15B] font-bold">متابعة مدد الإيجار والانتفاع</span>
          </div>

          <SmartAutoFitTable
            tableId="bakery_contracts"
            userId={currentUser.id}
            rows={contractRows}
            totalCount={activeBakeriesList.length}
            getRowId={(r) => r.id}
            columns={[
              {
                key: 'name',
                label: 'اسم المخبز',
                headerText: 'اسم المخبز',
                type: 'name',
                defaultWidth: 195,
                measureValue: (r) => `${r.name} (${r.village})`,
                render: (r) => <span className="font-extrabold text-[#102A43]">{r.name} ({r.village})</span>,
              },
              {
                key: 'leaseContractType',
                label: 'نوع العقد',
                headerText: 'نوع العقد',
                type: 'badge',
                align: 'center',
                defaultWidth: 115,
                render: (r) => <span className="font-extrabold">{r.leaseContractType}</span>,
              },
              {
                key: 'leaseContractNumber',
                label: 'رقم العقد',
                headerText: 'رقم العقد',
                type: 'numeric',
                align: 'center',
                defaultWidth: 145,
                measureValue: (r) => toArabicNumerals(r.leaseContractNumber || '—'),
                render: (r) => toArabicNumerals(r.leaseContractNumber || '—'),
              },
              {
                key: 'leaseExpiryDate',
                label: 'نهاية العقد',
                headerText: 'نهاية العقد',
                type: 'date',
                align: 'center',
                defaultWidth: 130,
                measureValue: (r) => formatDateArabic(r.leaseExpiryDate),
                render: (r) => <span className="font-extrabold">{formatDateArabic(r.leaseExpiryDate)}</span>,
              },
              {
                key: 'daysRemaining',
                label: 'الأيام المتبقية',
                headerText: 'الأيام المتبقية',
                type: 'numeric',
                align: 'center',
                defaultWidth: 115,
                measureValue: (r) => (r.daysRemaining !== null ? `${formatArabicNumber(r.daysRemaining)} يوم` : '—'),
                render: (r) => (
                  <span className="font-extrabold">
                    {r.daysRemaining !== null ? `${formatArabicNumber(r.daysRemaining)} يوم` : '—'}
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'حالة العقد',
                headerText: 'حالة العقد',
                type: 'badge',
                align: 'center',
                defaultWidth: 150,
                render: (r) => renderExpiryStatusBadge(r.status, r.severity),
              },
              {
                key: 'actions',
                label: 'الإجراءات',
                headerText: 'الإجراءات',
                type: 'actions',
                align: 'center',
                sortable: false,
                defaultWidth: 185,
                render: (r) => renderActionsMenu(r.bakery),
              },
            ]}
            sortKey={contractsSort.key}
            sortAsc={contractsSort.asc}
            onSort={(k) => setContractsSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
            selectable
            selectedIds={selectedBakeryIds}
            onToggleSelect={toggleSelectBakery}
            onClearSelection={() => setSelectedBakeryIds([])}
            pinnedKeys={subPinnedCols}
            onTogglePinColumn={toggleSubPin}
            onPinAll={() => setSubPinnedCols(['name'])}
            onUnpinAll={() => setSubPinnedCols([])}
            onResetPinDefaults={() => setSubPinnedCols(['name'])}
            onNotify={showToast}
            theadClassName="bg-slate-100 text-[#102A43] border-b border-slate-300"
          />
        </div>
      )}

      {/* =====================================================================
          8. نظام التنبيهات الذكي والصوتي (Section 7)
         ===================================================================== */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-4">
          {/* Audio Alert Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-black text-[#102A43]">
                مركز التنبيهات الذكي والصوتي لمواعيد انتهاء التراخيص والعقود (٣٠ / ١٥ / ٧ / ٣ أيام / يوم الانتهاء / منتهي)
              </h2>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                إشعارات صوتية مميزة للتراخيص المنتهية والعقود التي قاربت على الانتهاء مع حفظ إجراءات المتابعة والتجديد
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 border cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4" />}
                <span>{soundEnabled ? 'التنبيه الصوتي مفعل' : 'الصوت مكتوم'}</span>
              </button>

              <div className="flex items-center gap-2 bg-[#F4F7FB] px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-[10.5px] font-extrabold text-slate-700">الصوت:</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  className="w-20 accent-[#102A43]"
                />
              </div>

              <button
                type="button"
                onClick={() => playAlertSound('expired_license', soundVolume)}
                className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-[11px] font-extrabold cursor-pointer"
              >
                اختبار صوت منتهي
              </button>
              <button
                type="button"
                onClick={() => playAlertSound('expiring_contract', soundVolume)}
                className="px-3.5 py-2 bg-[#102A43] hover:bg-[#164E83] text-white rounded-xl text-[11px] font-extrabold cursor-pointer"
              >
                اختبار صوت قارب الانتهاء
              </button>
            </div>
          </div>

          <SmartAutoFitTable
            tableId="bakery_alerts"
            userId={currentUser.id}
            rows={alertRows}
            totalCount={allAlerts.length}
            getRowId={(al) => al.alertId}
            columns={[
              {
                key: 'bakeryName',
                label: 'اسم المخبز',
                headerText: 'اسم المخبز',
                type: 'name',
                defaultWidth: 180,
                render: (al) => <span className="font-extrabold text-[#102A43]">{al.bakery.name}</span>,
              },
              {
                key: 'ownerName',
                label: 'صاحب المخبز',
                headerText: 'صاحب المخبز',
                type: 'name',
                defaultWidth: 165,
                render: (al) => al.bakery.ownerName,
              },
              {
                key: 'village',
                label: 'القرية والوحدة',
                headerText: 'القرية والوحدة',
                type: 'name',
                defaultWidth: 195,
                measureValue: (al) => `${al.bakery.village} — ${al.bakery.localUnit}`,
                render: (al) => (
                  <span>
                    {al.bakery.village} — <span className="text-slate-600">{al.bakery.localUnit}</span>
                  </span>
                ),
              },
              {
                key: 'docLabel',
                label: 'نوع المستند',
                headerText: 'نوع المستند',
                type: 'text',
                defaultWidth: 155,
                render: (al) => <span className="font-extrabold text-[#164E83]">{al.docLabel}</span>,
              },
              {
                key: 'expiryDate',
                label: 'تاريخ الانتهاء',
                headerText: 'تاريخ الانتهاء',
                type: 'date',
                align: 'center',
                defaultWidth: 125,
                measureValue: (al) => formatDateArabic(al.expiryDate),
                render: (al) => <span className="font-extrabold">{formatDateArabic(al.expiryDate)}</span>,
              },
              {
                key: 'daysRemaining',
                label: 'الأيام المتبقية',
                headerText: 'الأيام المتبقية',
                type: 'numeric',
                align: 'center',
                defaultWidth: 115,
                measureValue: (al) => (al.daysRemaining !== null ? `${formatArabicNumber(al.daysRemaining)} يوم` : '—'),
                render: (al) => (
                  <span className="font-extrabold">
                    {al.daysRemaining !== null ? `${formatArabicNumber(al.daysRemaining)} يوم` : '—'}
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'حالة المستند',
                headerText: 'حالة المستند',
                type: 'badge',
                align: 'center',
                defaultWidth: 150,
                render: (al) => renderExpiryStatusBadge(al.status, al.severity),
              },
              {
                key: 'followUp',
                label: 'موقف المتابعة',
                headerText: 'موقف المتابعة',
                type: 'badge',
                align: 'center',
                sortable: false,
                defaultWidth: 140,
                render: (al) =>
                  al.actionState ? (
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {al.actionState.action === 'postponed'
                        ? `مؤجل (${toArabicNumerals(al.actionState.postponedUntil)})`
                        : 'تم التجديد'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-600">قيد المتابعة</span>
                  ),
              },
              {
                key: 'actions',
                label: 'إجراءات فورية',
                headerText: 'إجراءات فورية',
                type: 'actions',
                align: 'center',
                sortable: false,
                defaultWidth: 195,
                render: (al) => (
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenAction(al.bakery, 'details')}
                      className="px-2.5 py-1 bg-[#102A43] text-white rounded text-[10px] font-extrabold cursor-pointer"
                    >
                      الملف
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAlertQuickRenew(al.bakery, al.docType)}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-extrabold cursor-pointer"
                    >
                      تجديد
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAlertPostpone(al.bakery, al.docType)}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[10px] font-extrabold cursor-pointer"
                    >
                      تأجيل
                    </button>
                  </div>
                ),
              },
            ]}
            sortKey={alertsSort.key}
            sortAsc={alertsSort.asc}
            onSort={(k) => setAlertsSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
            pinnedKeys={subPinnedCols}
            onTogglePinColumn={toggleSubPin}
            onPinAll={() => setSubPinnedCols(['bakeryName'])}
            onUnpinAll={() => setSubPinnedCols([])}
            onResetPinDefaults={() => setSubPinnedCols(['bakeryName'])}
            onNotify={showToast}
            emptyMessage="جميع تراخيص وعقود المخابز سارية ولا توجد تنبيهات مستحقة حالياً."
          />
        </div>
      )}

      {/* =====================================================================
          9. سجل التعديلات والمراجعة (Section 14)
         ===================================================================== */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4 space-y-3">
          <div className="p-3.5 bg-[#102A43] text-white rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-[12px] font-black">سجل التدقيق والمراجعة لتعديلات المخابز والحصص والتراخيص والعقود (سجل تدقيق رسمي محمي)</h3>
              <p className="text-[10.5px] text-slate-300 font-bold">غير قابل للحذف أو التعديل من المستخدمين العاديين</p>
            </div>
            <span className="num-cell text-[11px] text-[#C6A15B] font-extrabold">{formatArabicNumber(auditChanges.length)} عملية موثقة</span>
          </div>

          <SmartAutoFitTable
            tableId="bakery_audit"
            userId={currentUser.id}
            rows={auditChanges}
            totalCount={auditChanges.length}
            getRowId={(ch) => ch.id}
            columns={[
              {
                key: 'timestamp',
                label: 'التاريخ والوقت',
                headerText: 'التاريخ والوقت',
                type: 'date',
                align: 'center',
                defaultWidth: 155,
                measureValue: (ch) => formatDateArabic(ch.timestamp, true),
                render: (ch) => <span className="text-slate-700">{formatDateArabic(ch.timestamp, true)}</span>,
              },
              {
                key: 'bakeryName',
                label: 'المخبز',
                headerText: 'المخبز',
                type: 'name',
                defaultWidth: 185,
                render: (ch) => <span className="font-extrabold text-[#102A43]">{ch.bakeryName}</span>,
              },
              {
                key: 'actionType',
                label: 'نوع العملية',
                headerText: 'نوع العملية',
                type: 'text',
                defaultWidth: 135,
                render: (ch) => <span className="font-extrabold text-[#164E83]">{ch.actionType}</span>,
              },
              {
                key: 'fieldName',
                label: 'الحقل المعدل',
                headerText: 'الحقل المعدل',
                type: 'text',
                defaultWidth: 155,
                render: (ch) => ch.fieldName,
              },
              {
                key: 'oldValue',
                label: 'القيمة القديمة',
                headerText: 'القيمة القديمة',
                type: 'longText',
                sortable: false,
                defaultWidth: 165,
                measureValue: (ch) => toArabicNumerals(ch.oldValue),
                render: (ch) => <span className="text-red-700">{toArabicNumerals(ch.oldValue)}</span>,
              },
              {
                key: 'newValue',
                label: 'القيمة الجديدة',
                headerText: 'القيمة الجديدة',
                type: 'longText',
                sortable: false,
                defaultWidth: 185,
                measureValue: (ch) => toArabicNumerals(ch.newValue),
                render: (ch) => <span className="text-emerald-800 font-extrabold">{toArabicNumerals(ch.newValue)}</span>,
              },
              {
                key: 'reason',
                label: 'سبب التعديل',
                headerText: 'سبب التعديل',
                type: 'longText',
                sortable: false,
                defaultWidth: 220,
                measureValue: (ch) => toArabicNumerals(ch.reason),
                render: (ch) => <span className="text-slate-700">{toArabicNumerals(ch.reason)}</span>,
              },
              {
                key: 'performedBy',
                label: 'المسؤول المنفذ',
                headerText: 'المسؤول المنفذ',
                type: 'name',
                defaultWidth: 155,
                render: (ch) => <span className="font-extrabold text-[#102A43]">{ch.performedBy}</span>,
              },
            ]}
            sortKey={auditSort.key}
            sortAsc={auditSort.asc}
            onSort={(k) => setAuditSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
            pinnedKeys={subPinnedCols}
            onTogglePinColumn={toggleSubPin}
            onPinAll={() => setSubPinnedCols(['bakeryName'])}
            onUnpinAll={() => setSubPinnedCols([])}
            onResetPinDefaults={() => setSubPinnedCols(['bakeryName'])}
            onNotify={showToast}
            theadClassName="bg-slate-100 text-[#102A43] border-b border-slate-300"
          />
        </div>
      )}

      {/* =====================================================================
          10. مركز التقارير والإحصائيات — ١٨ تقريراً رسمياً (Section 11)
         ===================================================================== */}
      {activeSubTab === 'reports' && (
        <div className="space-y-5">
          {/* 18 Reports Selector Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <h2 className="text-[13px] font-black text-[#102A43] mb-3">
              اختر التقرير الرسمي المطلوب استخراجه من بين (١٨) تقريراً معتمداً:
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { id: 1, title: '١. تقرير شامل لجميع المخابز' },
                { id: 2, title: '٢. تقرير المخابز حسب القرية' },
                { id: 3, title: '٣. تقرير المخابز حسب الوحدة المحلية' },
                { id: 4, title: '٤. تقرير الحصص الفعلية والتأمينية' },
                { id: 5, title: '٥. تقرير عدد الأرغفة اليومية' },
                { id: 6, title: '٦. تقرير متوسطات نصيب الفرد ٢٠٢٣' },
                { id: 7, title: '٧. تقرير متوسطات نصيب الفرد ٢٠٢٤' },
                { id: 8, title: '٨. تقرير متوسطات نصيب الفرد ٢٠٢٥' },
                { id: 9, title: '٩. تقرير مقارنة المتوسطات بين السنوات' },
                { id: 10, title: '١٠. تقرير المخابز ذات البيانات الناقصة' },
                { id: 11, title: '١١. تقرير التراخيص السارية' },
                { id: 12, title: '١٢. تقرير التراخيص المنتهية' },
                { id: 13, title: '١٣. تقرير التراخيص التي قاربت على الانتهاء' },
                { id: 14, title: '١٤. تقرير البطاقات الضريبية' },
                { id: 15, title: '١٥. تقرير العقود المنتهية' },
                { id: 16, title: '١٦. تقرير العقود التي قاربت على الانتهاء' },
                { id: 17, title: '١٧. تقرير شامل بالمستندات المطلوب تجديدها' },
                { id: 18, title: '١٨. تقرير موقف تفصيلي لكل مخبز' },
              ].map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`p-3 rounded-xl text-right text-[11px] font-extrabold border transition-all cursor-pointer ${
                    selectedReportId === rep.id
                      ? 'bg-[#102A43] text-white border-[#102A43] shadow-sm'
                      : 'bg-[#F4F7FB] text-[#102A43] border-slate-200 hover:bg-slate-200/70'
                  }`}
                >
                  {rep.title}
                </button>
              ))}
            </div>
          </div>

          {/* Official Report Sheet View */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-[#102A43] shadow-sm space-y-6">
            {/* Official Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b-2 border-[#102A43] gap-4">
              <div>
                <p className="text-[11px] font-black text-[#102A43]">جمهورية مصر العربية — محافظة الغربية</p>
                <p className="text-[11px] font-extrabold text-[#164E83]">مديرية التموين والتجارة الداخلية بالغربية</p>
                <p className="text-[11px] font-extrabold text-[#102A43]">إدارة تموين مركز المحلة الكبرى — قسم المخابز</p>
              </div>
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-black text-[#102A43]">
                  التقرير الرسمي رقم ({formatArabicNumber(selectedReportId)}) — بيان رقابي معتمد
                </h3>
                <span className="text-[10.5px] font-bold text-slate-600">
                  تاريخ ووقت الإنشاء: {formatDateArabic(clientNowIso, true)}
                </span>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#102A43] text-white rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#C6A15B]" />
                  <span>طباعة التقرير</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV(activeBakeriesList, `تقرير_${selectedReportId}_مخابز_المحلة`)}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير إكسل</span>
                </button>
              </div>
            </div>

            {/* Statistical Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F4F7FB] p-4 rounded-xl border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-600 font-bold block">إجمالي عدد المخابز بالتقرير:</span>
                <strong className="num-cell text-[13px] font-black text-[#102A43]">{formatArabicNumber(activeBakeriesList.length)} مخبز</strong>
              </div>
              <div>
                <span className="text-slate-600 font-bold block">إجمالي الحصص الفعلية:</span>
                <strong className="num-cell text-[13px] font-black text-[#164E83]">{formatArabicNumber(kpiStats.totalActualQuota)} شيكارة/يوم</strong>
              </div>
              <div>
                <span className="text-slate-600 font-bold block">إجمالي الأرغفة اليومية:</span>
                <strong className="num-cell text-[13px] font-black text-emerald-800">{formatArabicNumber(kpiStats.totalDailyLoaves)} رغيف</strong>
              </div>
              <div>
                <span className="text-slate-600 font-bold block">متوسط نصيب الفرد ٢٠٢٥:</span>
                <strong className="num-cell text-[13px] font-black text-[#102A43]">{formatArabicDecimal(kpiStats.avg2025, 2)} رغيف/فرد</strong>
              </div>
            </div>

            {/* Sortable & Auto-Fit Report Data Table (reflects Custom Column Headers) */}
            <SmartAutoFitTable
              tableId="bakery_reports"
              userId={currentUser.id}
              rows={reportRows}
              totalCount={activeBakeriesList.length}
              getRowId={(b) => b.id}
              columns={[
                {
                  key: 'serialNumber',
                  label: getColLabel('serialNumber', 'م'),
                  headerText: getColLabel('serialNumber', 'م'),
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 55,
                  measureValue: (_b) => '٩٩',
                  render: (_b, i) => formatArabicNumber(i + 1),
                },
                {
                  key: 'bakeryNumber',
                  label: getColLabel('bakeryNumber', 'رقم المخبز'),
                  headerText: getColLabel('bakeryNumber', 'رقم المخبز'),
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 100,
                  measureValue: (b) => toArabicNumerals(b.bakeryNumber),
                  render: (b) => <span className="font-extrabold">{toArabicNumerals(b.bakeryNumber)}</span>,
                },
                {
                  key: 'name',
                  label: getColLabel('name', 'اسم المخبز'),
                  headerText: getColLabel('name', 'اسم المخبز'),
                  type: 'name',
                  defaultWidth: 185,
                  render: (b) => <span className="font-extrabold text-[#102A43]">{b.name}</span>,
                },
                {
                  key: 'ownerName',
                  label: getColLabel('ownerName', 'صاحب المخبز'),
                  headerText: getColLabel('ownerName', 'صاحب المخبز'),
                  type: 'name',
                  defaultWidth: 165,
                  render: (b) => b.ownerName,
                },
                {
                  key: 'village',
                  label: getColLabel('village', 'القرية'),
                  headerText: getColLabel('village', 'القرية'),
                  type: 'text',
                  defaultWidth: 125,
                  render: (b) => b.village,
                },
                {
                  key: 'insuranceQuota',
                  label: getColLabel('insuranceQuota', 'الحصة التأمينية'),
                  headerText: getColLabel('insuranceQuota', 'الحصة التأمينية'),
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 115,
                  measureValue: (b) => formatArabicDecimal(b.insuranceQuota, 3),
                  render: (b) => formatArabicDecimal(b.insuranceQuota, 3),
                },
                {
                  key: 'actualQuota',
                  label: getColLabel('actualQuota', 'الحصة الفعلية'),
                  headerText: getColLabel('actualQuota', 'الحصة الفعلية'),
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 105,
                  measureValue: (b) => formatArabicNumber(b.actualQuota),
                  render: (b) => <span className="font-extrabold">{formatArabicNumber(b.actualQuota)}</span>,
                },
                {
                  key: 'dailyLoavesCount',
                  label: getColLabel('dailyLoavesCount', 'الأرغفة اليومية'),
                  headerText: getColLabel('dailyLoavesCount', 'الأرغفة اليومية'),
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 120,
                  measureValue: (b) => formatArabicNumber(b.dailyLoavesCount),
                  render: (b) => <span className="font-extrabold">{formatArabicNumber(b.dailyLoavesCount)}</span>,
                },
                {
                  key: 'avgPerCapita2023',
                  label: getColLabel('avgPerCapita2023', 'متوسط ٢٠٢٣'),
                  headerText: getColLabel('avgPerCapita2023', 'متوسط ٢٠٢٣'),
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 95,
                  measureValue: (b) => formatArabicDecimal(b.avgPerCapita2023, 2),
                  render: (b) => formatArabicDecimal(b.avgPerCapita2023, 2),
                },
                {
                  key: 'avgPerCapita2024',
                  label: getColLabel('avgPerCapita2024', 'متوسط ٢٠٢٤'),
                  headerText: getColLabel('avgPerCapita2024', 'متوسط ٢٠٢٤'),
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 95,
                  measureValue: (b) => formatArabicDecimal(b.avgPerCapita2024, 2),
                  render: (b) => formatArabicDecimal(b.avgPerCapita2024, 2),
                },
                {
                  key: 'avgPerCapita2025',
                  label: getColLabel('avgPerCapita2025', 'متوسط ٢٠٢٥'),
                  headerText: getColLabel('avgPerCapita2025', 'متوسط ٢٠٢٥'),
                  type: 'numeric',
                  align: 'center',
                  defaultWidth: 95,
                  measureValue: (b) => formatArabicDecimal(b.avgPerCapita2025, 2),
                  render: (b) => <span className="font-extrabold">{formatArabicDecimal(b.avgPerCapita2025, 2)}</span>,
                },
                {
                  key: 'combinedDocStatus',
                  label: 'حالة الرخصة والعقد',
                  headerText: 'حالة الرخصة والعقد',
                  type: 'longText',
                  sortable: false,
                  align: 'center',
                  defaultWidth: 215,
                  measureValue: (b) => toArabicNumerals(b.combinedDocStatus),
                  render: (b) => toArabicNumerals(b.combinedDocStatus),
                },
              ]}
              sortKey={reportsSort.key}
              sortAsc={reportsSort.asc}
              onSort={(k) => setReportsSort(s => ({ key: k, asc: s.key === k ? !s.asc : true }))}
              selectable
              selectedIds={selectedBakeryIds}
              onToggleSelect={toggleSelectBakery}
              onClearSelection={() => setSelectedBakeryIds([])}
              pinnedKeys={subPinnedCols}
              onTogglePinColumn={toggleSubPin}
              onPinAll={() => setSubPinnedCols(['name'])}
              onUnpinAll={() => setSubPinnedCols([])}
              onResetPinDefaults={() => setSubPinnedCols(['name'])}
              onOpenHeaderCustomizer={() => setShowColumnModal(true)}
              onNotify={showToast}
            />

            {/* Official 3 Signatures Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t-2 border-slate-200 text-center text-[11px]">
              <div>
                <p className="font-extrabold text-slate-700 mb-1">توقيع معد التقرير</p>
                <p className="font-black text-[#102A43]">{preparerName}</p>
                <p className="text-[10px] text-slate-400 mt-4">التوقيع: ...............................</p>
              </div>
              <div>
                <p className="font-extrabold text-slate-700 mb-1">توقيع المراجع المختص</p>
                <p className="font-black text-[#102A43]">{reviewerName}</p>
                <p className="text-[10px] text-slate-400 mt-4">التوقيع: ...............................</p>
              </div>
              <div>
                <p className="font-extrabold text-slate-700 mb-1">يعتمد، مدير الإدارة</p>
                <p className="font-black text-[#102A43]">{managerApprovalName}</p>
                <p className="text-[10px] text-slate-400 mt-4">خاتم شعار الجمهورية: ...............................</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          11. مركز الطباعة والتصدير (Section 12)
         ===================================================================== */}
      {activeSubTab === 'print' && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 print:hidden">
            <h2 className="text-base font-black text-[#102A43]">مركز الطباعة الرسمية والتصدير العربي المعتمد</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">نطاق الطباعة</label>
                <select
                  value={printScope}
                  onChange={(e) => setPrintScope(e.target.value as typeof printScope)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                >
                  <option value="all">طباعة جميع المخابز</option>
                  <option value="single">طباعة ملف مخبز واحد</option>
                  <option value="village">طباعة مخابز قرية معينة</option>
                  <option value="filtered">طباعة نتائج البحث الحالية</option>
                  <option value="expired">طباعة المستندات المنتهية فقط</option>
                  <option value="quotas">طباعة تقرير الحصص</option>
                  <option value="averages">طباعة تقارير المتوسطات</option>
                </select>
              </div>

              {printScope === 'single' && (
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">اختر المخبز</label>
                  <select
                    value={printSingleBakeryId}
                    onChange={(e) => setPrintSingleBakeryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  >
                    {activeBakeriesList.map(b => (
                      <option key={b.id} value={b.id}>{b.name} (#{toArabicNumerals(b.bakeryNumber)})</option>
                    ))}
                  </select>
                </div>
              )}

              {printScope === 'village' && (
                <div>
                  <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">اختر القرية</label>
                  <select
                    value={printVillageName}
                    onChange={(e) => setPrintVillageName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                  >
                    {liveVillages.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">اتجاه ورق الطباعة</label>
                <select
                  value={printOrientation}
                  onChange={(e) => setPrintOrientation(e.target.value as 'landscape' | 'portrait')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                >
                  <option value="landscape">أفقي (ورق عرضي)</option>
                  <option value="portrait">رأسي (ورق طولي)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#102A43] mb-1">اسم معد البيان</label>
                <input
                  type="text"
                  value={preparerName}
                  onChange={(e) => setPreparerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-[#102A43] hover:bg-[#164E83] text-white rounded-xl text-[11px] font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#C6A15B]" />
                <span>طباعة مباشرة / حفظ ملف رسمي</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCSV(filteredBakeries, 'تصدير_رسمي_مخابز_المحلة')}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير إكسل (دعم كامل للعربية)</span>
              </button>
            </div>
          </div>

          {/* Printable Preview Container */}
          <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b-2 border-[#102A43] pb-4">
              <div>
                <h3 className="text-[13px] font-black text-[#102A43]">محافظة الغربية — مديرية التموين والتجارة الداخلية</h3>
                <p className="text-[11px] font-extrabold text-[#164E83]">إدارة تموين مركز المحلة الكبرى — مركز الطباعة الرسمي</p>
              </div>
              <div className="text-left text-[11px] font-bold">
                <p>التاريخ: <span className="num-cell">{formatDateArabic(clientNowIso, false)}</span></p>
                <p>اتجاه الطباعة: {printOrientation === 'landscape' ? 'أفقي' : 'رأسي'}</p>
              </div>
            </div>

            {printScope === 'single' ? (
              (() => {
                const b = activeBakeriesList.find(x => x.id === printSingleBakeryId) || activeBakeriesList[0];
                if (!b) return null;
                return (
                  <div className="space-y-4 text-[11px]">
                    <h4 className="text-base font-black text-[#102A43] bg-[#F4F7FB] p-3 rounded-xl border border-slate-200">
                      بطاقة بيان مخبز معتمدة: {b.name} — رقم ({toArabicNumerals(b.bakeryNumber)})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border border-slate-200 rounded-xl">
                      <div><span className="text-slate-600">{getColLabel('ownerName', 'صاحب المخبز')}:</span> <strong>{b.ownerName}</strong></div>
                      <div><span className="text-slate-600">{getColLabel('ownerNationalId', 'الرقم القومي')}:</span> <strong className="num-cell">{toArabicNumerals(b.ownerNationalId)}</strong></div>
                      <div><span className="text-slate-600">{getColLabel('phone', 'رقم الهاتف')}:</span> <strong className="num-cell">{toArabicNumerals(b.phone)}</strong></div>
                      <div><span className="text-slate-600">القرية والوحدة:</span> <strong>{b.village} - {b.localUnit}</strong></div>
                      <div><span className="text-slate-600">{getColLabel('posNumber', 'رقم الماكينة')}:</span> <strong className="num-cell">{toArabicNumerals(b.posNumber)}</strong></div>
                      <div><span className="text-slate-600">نوع الخبز والمعامل:</span> <strong>{b.breadType} ({formatArabicNumber(b.productionFactor)})</strong></div>
                      <div><span className="text-slate-600">الحصة التأمينية (م١):</span> <strong className="num-cell">{formatArabicDecimal(b.insuranceQuota, 3)} شيكارة</strong></div>
                      <div><span className="text-slate-600">{getColLabel('actualQuota', 'الحصة الفعلية')}:</span> <strong className="num-cell">{formatArabicNumber(b.actualQuota)} شيكارة</strong></div>
                      <div><span className="text-slate-600">الأرغفة اليومية (م٢):</span> <strong className="num-cell">{formatArabicNumber(b.dailyLoavesCount)} رغيف</strong></div>
                      <div><span className="text-slate-600">متوسط ٢٠٢٣ / ٢٠٢٤ / ٢٠٢٥:</span> <strong className="num-cell">{formatArabicDecimal(b.avgPerCapita2023, 2)} / {formatArabicDecimal(b.avgPerCapita2024, 2)} / {formatArabicDecimal(b.avgPerCapita2025, 2)}</strong></div>
                      <div><span className="text-slate-600">رقم الرخصة وانتهاؤها:</span> <strong className="num-cell">{toArabicNumerals(b.licenseNumber)} ({formatDateArabic(b.licenseExpiryDate)})</strong></div>
                      <div><span className="text-slate-600">عقد الإيجار وانتهاؤه:</span> <strong className="num-cell">{toArabicNumerals(b.leaseContractNumber)} ({formatDateArabic(b.leaseExpiryDate)})</strong></div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <SmartAutoFitTable
                tableId="bakery_print_preview"
                userId={currentUser.id}
                rows={
                  printScope === 'village'
                    ? activeBakeriesList.filter(b => b.village === printVillageName)
                    : filteredBakeries
                }
                totalCount={activeBakeriesList.length}
                getRowId={(b) => b.id}
                columns={[
                  {
                    key: 'serialNumber',
                    label: getColLabel('serialNumber', 'م'),
                    headerText: getColLabel('serialNumber', 'م'),
                    type: 'numeric',
                    align: 'center',
                    defaultWidth: 55,
                    measureValue: () => '٩٩',
                    render: (_b, idx) => formatArabicNumber(idx + 1),
                  },
                  {
                    key: 'bakeryNumber',
                    label: getColLabel('bakeryNumber', 'رقم المخبز'),
                    headerText: getColLabel('bakeryNumber', 'رقم المخبز'),
                    type: 'numeric',
                    align: 'center',
                    defaultWidth: 100,
                    measureValue: (b) => toArabicNumerals(b.bakeryNumber),
                    render: (b) => <span className="font-extrabold">{toArabicNumerals(b.bakeryNumber)}</span>,
                  },
                  {
                    key: 'name',
                    label: getColLabel('name', 'اسم المخبز'),
                    headerText: getColLabel('name', 'اسم المخبز'),
                    type: 'name',
                    defaultWidth: 185,
                    render: (b) => <span className="font-extrabold text-[#102A43]">{b.name}</span>,
                  },
                  {
                    key: 'ownerName',
                    label: getColLabel('ownerName', 'المالك'),
                    headerText: getColLabel('ownerName', 'المالك'),
                    type: 'name',
                    defaultWidth: 165,
                    render: (b) => b.ownerName,
                  },
                  {
                    key: 'village',
                    label: getColLabel('village', 'القرية'),
                    headerText: getColLabel('village', 'القرية'),
                    type: 'text',
                    defaultWidth: 125,
                    render: (b) => b.village,
                  },
                  {
                    key: 'actualQuota',
                    label: getColLabel('actualQuota', 'الحصة الفعلية'),
                    headerText: getColLabel('actualQuota', 'الحصة الفعلية'),
                    type: 'numeric',
                    align: 'center',
                    defaultWidth: 105,
                    measureValue: (b) => formatArabicNumber(b.actualQuota),
                    render: (b) => <span className="font-extrabold">{formatArabicNumber(b.actualQuota)}</span>,
                  },
                  {
                    key: 'dailyLoavesCount',
                    label: getColLabel('dailyLoavesCount', 'الأرغفة اليومية'),
                    headerText: getColLabel('dailyLoavesCount', 'الأرغفة اليومية'),
                    type: 'numeric',
                    align: 'center',
                    defaultWidth: 120,
                    measureValue: (b) => formatArabicNumber(b.dailyLoavesCount),
                    render: (b) => formatArabicNumber(b.dailyLoavesCount),
                  },
                  {
                    key: 'avgPerCapita2025',
                    label: getColLabel('avgPerCapita2025', 'متوسط ٢٠٢٥'),
                    headerText: getColLabel('avgPerCapita2025', 'متوسط ٢٠٢٥'),
                    type: 'numeric',
                    align: 'center',
                    defaultWidth: 95,
                    measureValue: (b) => formatArabicDecimal(b.avgPerCapita2025, 2),
                    render: (b) => formatArabicDecimal(b.avgPerCapita2025, 2),
                  },
                  {
                    key: 'licenseExpiryDate',
                    label: getColLabel('licenseExpiryDate', 'انتهاء الرخصة'),
                    headerText: getColLabel('licenseExpiryDate', 'انتهاء الرخصة'),
                    type: 'date',
                    align: 'center',
                    defaultWidth: 125,
                    measureValue: (b) => formatDateArabic(b.licenseExpiryDate),
                    render: (b) => formatDateArabic(b.licenseExpiryDate),
                  },
                ]}
                pinnedKeys={subPinnedCols}
                onTogglePinColumn={toggleSubPin}
                onPinAll={() => setSubPinnedCols(['name'])}
                onUnpinAll={() => setSubPinnedCols([])}
                onResetPinDefaults={() => setSubPinnedCols(['name'])}
                onOpenHeaderCustomizer={() => setShowColumnModal(true)}
                onNotify={showToast}
                maxHeightClass="max-h-none"
              />
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          12. إعدادات الجداول وتعديل رؤوس الأعمدة (Section 9)
         ===================================================================== */}
      {(activeSubTab === 'columns' || showColumnModal) && (
        <div className={showColumnModal ? 'fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto' : ''}>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-5xl w-full shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-black text-[#102A43]">
                  تخصيص رؤوس الأعمدة وعناوين المجموعات الخمس ({formatArabicNumber(columns.length)} عموداً)
                </h2>
                <p className="text-[11px] font-bold text-slate-600">
                  تعديل اسم أي عمود، إعادة الترتيب، إظهار/إخفاء، وتثبيت الأعمدة مع حفظ فوري لكل مستخدم وانعكاس على السجل والتقارير والطباعة والتصدير دون تغيير حقول قاعدة البيانات
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowColumnModal(false);
                    handleNavSelect('audit', 'audit');
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#102A43] rounded-lg text-[11px] font-extrabold cursor-pointer"
                >
                  فتح سجل المراجعة ({formatArabicNumber(auditChanges.length)})
                </button>
                {showColumnModal && (
                  <button
                    type="button"
                    onClick={() => setShowColumnModal(false)}
                    className="text-slate-400 hover:text-slate-700 font-bold text-base cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* تعديل عناوين المجموعات الخمس الرئيسية */}
            <div className="bg-[#F4F7FB] p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-[11px] font-black text-[#102A43]">أولاً: تعديل عناوين المجموعات الرئيسية الخمس</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {(Object.keys(columnGroups) as Array<keyof BakeryColumnGroupConfig>).map((gKey) => {
                  const groupArabicNames: Record<keyof BakeryColumnGroupConfig, string> = {
                    basic: 'المجموعة الأولى (الأساسية)',
                    operation: 'المجموعة الثانية (التشغيل)',
                    quota: 'المجموعة الثالثة (الحصص)',
                    population: 'المجموعة الرابعة (المستفيدون)',
                    documents: 'المجموعة الخامسة (المستندات)',
                  };
                  return (
                    <div key={gKey}>
                      <label className="block text-xs font-extrabold text-slate-600 mb-1">{groupArabicNames[gKey]}</label>
                      <input
                        type="text"
                        value={columnGroups[gKey]}
                        onChange={(e) => {
                          const updated = { ...columnGroups, [gKey]: e.target.value };
                          setColumnGroups(updated);
                          saveStoredBakeryColumnGroups(updated);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-[11px] font-extrabold text-[#102A43]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* جدول التحكم في الأعمدة الـ ٤٩ مع إعادة الترتيب */}
            <div className="max-h-96 overflow-auto border border-slate-200 rounded-xl compact-table-scroll">
              <table className="w-full text-right">
                <thead className="bg-[#102A43] text-white sticky top-0 z-10">
                  <tr>
                    <th className="text-center">الترتيب</th>
                    <th className="text-center">نقل</th>
                    <th>الاسم الافتراضي</th>
                    <th>عنوان العمود المخصص للعرض</th>
                    <th className="text-center">العرض (بكسل)</th>
                    <th className="text-center">إظهار</th>
                    <th className="text-center">تثبيت</th>
                    <th className="text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[...columns]
                    .sort((a, b) => a.order - b.order)
                    .map((col, idx, sortedArr) => (
                      <tr key={col.key} className="hover:bg-slate-50">
                        <td className="num-cell text-center font-bold">{formatArabicNumber(col.order)}</td>
                        <td className="text-center">
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveColumn(col.key, 'up')}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                              title="تقديم العمود لأعلى"
                            >
                              <ArrowUp className="w-3 h-3 text-[#102A43]" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === sortedArr.length - 1}
                              onClick={() => handleMoveColumn(col.key, 'down')}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                              title="تأخير العمود لأسفل"
                            >
                              <ArrowDown className="w-3 h-3 text-[#102A43]" />
                            </button>
                          </div>
                        </td>
                        <td className="text-slate-600">{toArabicNumerals(col.defaultLabel)}</td>
                        <td>
                          <input
                            type="text"
                            value={col.customLabel}
                            onChange={(e) => {
                              const updated = columns.map((c) =>
                                c.key === col.key ? { ...c, customLabel: e.target.value } : c
                              );
                              setColumns(updated);
                            }}
                            className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs font-bold text-[#102A43]"
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="number"
                            value={col.width}
                            onChange={(e) => {
                              const updated = columns.map((c) =>
                                c.key === col.key ? { ...c, width: Number(e.target.value) || 90 } : c
                              );
                              setColumns(updated);
                            }}
                            className="w-20 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={col.visible}
                            onChange={(e) => {
                              const updated = columns.map((c) =>
                                c.key === col.key ? { ...c, visible: e.target.checked } : c
                              );
                              setColumns(updated);
                            }}
                            className="w-4 h-4 accent-[#102A43] cursor-pointer"
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={col.pinned}
                            onChange={(e) => {
                              const updated = columns.map((c) =>
                                c.key === col.key ? { ...c, pinned: e.target.checked } : c
                              );
                              setColumns(updated);
                            }}
                            className="w-4 h-4 accent-[#164E83] cursor-pointer"
                          />
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = columns.map((c) =>
                                c.key === col.key ? { ...c, customLabel: c.defaultLabel, visible: true, pinned: false } : c
                              );
                              setColumns(updated);
                              showToast(`تمت استعادة الإعداد الافتراضي للعمود (${col.defaultLabel}).`);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[10px] font-black cursor-pointer"
                          >
                            افتراضي
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetColumns}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-extrabold cursor-pointer"
                >
                  استعادة الإعدادات الافتراضية
                </button>
                <button
                  type="button"
                  onClick={handlePinAllColumns}
                  className="px-3.5 py-2 bg-[#164E83]/10 hover:bg-[#164E83]/20 text-[#102A43] rounded-xl text-[11px] font-extrabold cursor-pointer"
                >
                  تثبيت الكل الذكي
                </button>
                <button
                  type="button"
                  onClick={handleUnpinAllColumns}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-extrabold cursor-pointer"
                >
                  إلغاء تثبيت الكل
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  saveStoredBakeryColumns(columns, currentUser.id);
                  saveStoredBakeryColumnGroups(columnGroups);
                  setShowColumnModal(false);
                  showToast('تم حفظ تفضيلات رؤوس الأعمدة لحسابك وتطبيقها على السجل والتقارير والطباعة والتصدير');
                }}
                className="px-6 py-2.5 bg-[#102A43] hover:bg-[#164E83] text-white rounded-xl text-[11px] font-extrabold cursor-pointer"
              >
                حفظ الإعدادات وتطبيقها
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          نافذة الإجراءات الموحدة للمخبز (Action Modal: Details, Quota, Licenses, Contracts, History)
         ===================================================================== */}
      {selectedBakery && actionModalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-black text-[#102A43]">
                  {selectedBakery.name} — رقم ({toArabicNumerals(selectedBakery.bakeryNumber)})
                </h3>
                <p className="text-[11px] font-bold text-slate-600">
                  {selectedBakery.village} · {selectedBakery.localUnit} · المالك: {selectedBakery.ownerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionModalType(null);
                  setSelectedBakery(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionModalType === 'details' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-bold bg-[#F4F7FB] p-4 rounded-xl border border-slate-200">
                <div><span className="text-slate-600">رقم ماكينة الصرف:</span> <strong className="num-cell">{toArabicNumerals(selectedBakery.posNumber)}</strong></div>
                <div><span className="text-slate-600">الرقم القومي للمالك:</span> <strong className="num-cell">{toArabicNumerals(selectedBakery.ownerNationalId)}</strong></div>
                <div><span className="text-slate-600">رقم الهاتف:</span> <strong className="num-cell">{toArabicNumerals(selectedBakery.phone)}</strong></div>
                <div><span className="text-slate-600">نوع الخبز والمعامل:</span> <strong>{selectedBakery.breadType} ({formatArabicNumber(selectedBakery.productionFactor)})</strong></div>
                <div><span className="text-slate-600">المبلغ التأميني:</span> <strong className="num-cell">{formatArabicNumber(selectedBakery.insuranceAmountEgp)} ج.م</strong></div>
                <div><span className="text-slate-600">الحصة التأمينية (م١):</span> <strong className="num-cell text-[#164E83]">{formatArabicDecimal(selectedBakery.insuranceQuota, 3)} شيكارة</strong></div>
                <div><span className="text-slate-600">الحصة الفعلية:</span> <strong className="num-cell">{formatArabicNumber(selectedBakery.actualQuota)} شيكارة</strong></div>
                <div><span className="text-slate-600">الأرغفة اليومية (م٢):</span> <strong className="num-cell text-emerald-800">{formatArabicNumber(selectedBakery.dailyLoavesCount)} رغيف</strong></div>
                <div><span className="text-slate-600">متوسطات ٢٠٢٣ / ٢٠٢٤ / ٢٠٢٥:</span> <strong className="num-cell">{formatArabicDecimal(selectedBakery.avgPerCapita2023, 2)} / {formatArabicDecimal(selectedBakery.avgPerCapita2024, 2)} / {formatArabicDecimal(selectedBakery.avgPerCapita2025, 2)}</strong></div>
                <div><span className="text-slate-600">الفرق التراكمي (م٦):</span> <strong className="num-cell">{formatArabicDecimal(selectedBakery.cumulativeAvgDifference, 2)}</strong></div>
                <div><span className="text-slate-600">رخصة المخبز:</span> <strong>{toArabicNumerals(selectedBakery.licenseNumber)} (تنتهي: <span className="num-cell">{formatDateArabic(selectedBakery.licenseExpiryDate)}</span>)</strong></div>
                <div><span className="text-slate-600">عقد الإيجار:</span> <strong>{toArabicNumerals(selectedBakery.leaseContractNumber)} (ينتهي: <span className="num-cell">{formatDateArabic(selectedBakery.leaseExpiryDate)}</span>)</strong></div>
              </div>
            )}

            {actionModalType === 'equations' && (
              <div className="space-y-3 text-[11px] font-bold">
                <div className="p-3.5 bg-[#F4F7FB] rounded-xl border border-slate-200 space-y-2">
                  <div>١. الحصة التأمينية = <span className="num-cell">{formatArabicNumber(selectedBakery.insuranceAmountEgp)}</span> ÷ ٢٣٥ ÷ ٣ = <strong className="num-cell">{formatArabicDecimal(selectedBakery.insuranceQuota, 3)} شيكارة</strong></div>
                  <div>٢. الأرغفة اليومية = <span className="num-cell">{formatArabicNumber(selectedBakery.actualQuota)}</span> × <span className="num-cell">{formatArabicNumber(selectedBakery.productionFactor)}</span> = <strong className="num-cell">{formatArabicNumber(selectedBakery.dailyLoavesCount)} رغيف</strong></div>
                  <div>٣. متوسط ٢٠٢٣ = <span className="num-cell">{formatArabicNumber(selectedBakery.dailyLoavesCount)}</span> ÷ <span className="num-cell">{formatArabicNumber(selectedBakery.beneficiaries2023)}</span> = <strong className="num-cell">{formatArabicDecimal(selectedBakery.avgPerCapita2023, 2)}</strong></div>
                  <div>٤. متوسط ٢٠٢٤ = <span className="num-cell">{formatArabicNumber(selectedBakery.dailyLoavesCount)}</span> ÷ <span className="num-cell">{formatArabicNumber(selectedBakery.beneficiaries2024)}</span> = <strong className="num-cell">{formatArabicDecimal(selectedBakery.avgPerCapita2024, 2)}</strong></div>
                  <div>٥. متوسط ٢٠٢٥ = <span className="num-cell">{formatArabicNumber(selectedBakery.dailyLoavesCount)}</span> ÷ <span className="num-cell">{formatArabicNumber(selectedBakery.beneficiaries2025)}</span> = <strong className="num-cell">{formatArabicDecimal(selectedBakery.avgPerCapita2025, 2)}</strong></div>
                  <div>٦. الفرق التراكمي = <span className="num-cell">{formatArabicDecimal(selectedBakery.avgPerCapita2023, 2)}</span> − <span className="num-cell">{formatArabicDecimal(selectedBakery.avgPerCapita2024, 2)}</span> − <span className="num-cell">{formatArabicDecimal(selectedBakery.avgPerCapita2025, 2)}</span> = <strong className="num-cell">{formatArabicDecimal(selectedBakery.cumulativeAvgDifference, 2)}</strong></div>
                  <div>٧. نصيب الفرد اليومي الفعلي ٢٠٢٥ = <strong className="num-cell">{formatArabicDecimal(selectedBakery.dailyShareActual2025, 2)} رغيف/مستفيد</strong></div>
                </div>
              </div>
            )}

            {actionModalType === 'history' && (
              <div className="max-h-64 overflow-auto border border-slate-200 rounded-xl compact-table-scroll">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 sticky top-0 z-10 text-[11px] font-black text-[#102A43]">
                    <tr>
                      <th className="text-center px-3 py-2">التاريخ</th>
                      <th className="px-3 py-2">العملية</th>
                      <th className="px-3 py-2">القيمة الجديدة</th>
                      <th className="px-3 py-2">المسؤول</th>
                      <th className="text-center px-3 py-2">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-bold">
                    {auditChanges
                      .filter(a => a.bakeryId === selectedBakery.id || a.bakeryId === 'ALL')
                      .map(a => (
                        <tr key={a.id}>
                          <td className="num-cell text-center px-3 py-2">{formatDateArabic(a.timestamp, false)}</td>
                          <td className="font-extrabold px-3 py-2">{a.actionType}</td>
                          <td className="text-emerald-800 px-3 py-2">{toArabicNumerals(a.newValue)}</td>
                          <td className="px-3 py-2">{a.performedBy}</td>
                          <td className="text-center px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setActionModalType('details')}
                              className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                            >
                              ملف المخبز
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {(actionModalType === 'quota' ||
              actionModalType === 'licenses' ||
              actionModalType === 'contracts' ||
              actionModalType === 'add_doc') && (
              <form onSubmit={handleSaveActionModal} className="space-y-4 text-[11px] font-bold">
                {actionModalType === 'quota' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-extrabold mb-1">الحصة الفعلية (شيكارة)</label>
                      <input
                        type="number"
                        required
                        value={editQuotaVal}
                        onChange={(e) => setEditQuotaVal(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold mb-1">المبلغ التأميني (ج.م)</label>
                      <input
                        type="number"
                        required
                        value={editInsuranceVal}
                        onChange={(e) => setEditInsuranceVal(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold mb-1">معامل الإنتاج</label>
                      <select
                        value={editFactorVal}
                        onChange={(e) => setEditFactorVal(Number(e.target.value) === 725 ? 725 : 660)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                      >
                        <option value={660}>٦٦٠</option>
                        <option value={725}>٧٢٥</option>
                      </select>
                    </div>
                  </div>
                )}

                {(actionModalType === 'licenses' || actionModalType === 'add_doc') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-extrabold mb-1">رقم الرخصة</label>
                      <input
                        type="text"
                        value={editLicenseNum}
                        onChange={(e) => setEditLicenseNum(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold mb-1">تاريخ انتهاء الرخصة</label>
                      <input
                        type="date"
                        value={editLicenseExp}
                        onChange={(e) => setEditLicenseExp(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold mb-1">رقم البطاقة الضريبية</label>
                      <input
                        type="text"
                        value={editTaxNum}
                        onChange={(e) => setEditTaxNum(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold mb-1">تاريخ انتهاء البطاقة الضريبية</label>
                      <input
                        type="date"
                        value={editTaxExp}
                        onChange={(e) => setEditTaxExp(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {actionModalType === 'contracts' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-extrabold mb-1">رقم عقد الإيجار / الملكية</label>
                      <input
                        type="text"
                        value={editLeaseNum}
                        onChange={(e) => setEditLeaseNum(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold mb-1">تاريخ انتهاء العقد</label>
                      <input
                        type="date"
                        value={editLeaseExp}
                        onChange={(e) => setEditLeaseExp(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-extrabold mb-1">سبب التعديل (يوثق في سجل التدقيق والمراجعة)</label>
                  <input
                    type="text"
                    required
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="اذكر رقم القرار أو سبب التحديث..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActionModalType(null);
                      setSelectedBakery(null);
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-800 rounded-xl font-extrabold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#102A43] hover:bg-[#164E83] text-white rounded-xl font-extrabold cursor-pointer"
                  >
                    حفظ التعديلات واعتمادها
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
