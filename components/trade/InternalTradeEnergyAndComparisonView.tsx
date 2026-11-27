'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Flame,
  Fuel,
  Plus,
  Printer,
  Scale,
  Search,
  Truck,
  Warehouse,
} from 'lucide-react';
import {
  ButaneDistributorMovementRecord,
  ButaneDistributorRecord,
  ButaneVillageAllocationRecord,
  ButaneWarehouseMovementRecord,
  ButaneWarehouseRecord,
  CommercialEstablishmentRecord,
  CommercialLicenseRecord,
  CommercialSettlementRecord,
  CommercialViolationReportRecord,
  CommodityPriceObservationRecord,
  FuelStationDailyMovementRecord,
  FuelStationInspectionRecord,
  FuelStationRecord,
  InternalTradeSettings,
  PetroleumAllocationRecord,
  PetroleumProductType,
  TradeInspectionCampaignRecord,
  computeButanePerCapitaShare,
  computeButaneWarehouseClosingBalance,
  computeDistributorRemainingBalance,
  computeFuelStationClosingBalance,
  computePetroleumMetrics,
} from '@/lib/internal-trade-store';
import {
  formatArabicCurrency,
  formatArabicNumber,
  formatDateArabic,
  toArabicNumerals,
} from '@/lib/utils';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import { round2 } from '@/lib/debts-engine';
import SmartAutoFitTable, { SmartTableColumn } from '../SmartAutoFitTable';
import { OfficialPrintModal } from '../debts/DebtsSharedUi';
import {
  EditableFieldSpec,
  TableActionButtons,
  UniversalCrudModal,
} from './TradeSharedCrudUi';

export type EnergyOrComparisonScreenKey =
  | 'butane_management'
  | 'butane_beneficiaries'
  | 'petroleum_management'
  | 'petroleum_beneficiaries'
  | 'fuel_stations'
  | 'butane_warehouses'
  | 'butane_distributors'
  | 'village_comparison';

interface InternalTradeEnergyAndComparisonViewProps {
  activeScreen: EnergyOrComparisonScreenKey;
  userId: string;
  currentUserName: string;
  todayRef: string;
  settings: InternalTradeSettings;
  onUpdateSettings: (next: InternalTradeSettings) => void;
  establishments: CommercialEstablishmentRecord[];
  licenses: CommercialLicenseRecord[];
  campaigns: TradeInspectionCampaignRecord[];
  reports: CommercialViolationReportRecord[];
  settlements: CommercialSettlementRecord[];
  priceObservations: CommodityPriceObservationRecord[];
  butaneAllocations: ButaneVillageAllocationRecord[];
  onSaveButaneAllocations: (next: ButaneVillageAllocationRecord[]) => void;
  petroleumAllocations: PetroleumAllocationRecord[];
  onSavePetroleumAllocations: (next: PetroleumAllocationRecord[]) => void;
  fuelStations: FuelStationRecord[];
  onSaveFuelStations: (next: FuelStationRecord[]) => void;
  fuelMovements: FuelStationDailyMovementRecord[];
  onSaveFuelMovements: (next: FuelStationDailyMovementRecord[]) => void;
  fuelInspections: FuelStationInspectionRecord[];
  onSaveFuelInspections: (next: FuelStationInspectionRecord[]) => void;
  butaneWarehouses: ButaneWarehouseRecord[];
  onSaveButaneWarehouses: (next: ButaneWarehouseRecord[]) => void;
  butaneWarehouseMovements: ButaneWarehouseMovementRecord[];
  onSaveButaneWarehouseMovements: (next: ButaneWarehouseMovementRecord[]) => void;
  butaneDistributors: ButaneDistributorRecord[];
  onSaveButaneDistributors: (next: ButaneDistributorRecord[]) => void;
  butaneDistributorMovements: ButaneDistributorMovementRecord[];
  onSaveButaneDistributorMovements: (next: ButaneDistributorMovementRecord[]) => void;
  onNotify: (msg: string) => void;
}

export default function InternalTradeEnergyAndComparisonView({
  activeScreen,
  userId,
  currentUserName,
  todayRef,
  settings,
  onUpdateSettings,
  establishments,
  licenses,
  campaigns,
  reports,
  settlements,
  priceObservations,
  butaneAllocations,
  onSaveButaneAllocations,
  petroleumAllocations,
  onSavePetroleumAllocations,
  fuelStations,
  onSaveFuelStations,
  fuelMovements,
  onSaveFuelMovements,
  fuelInspections,
  onSaveFuelInspections,
  butaneWarehouses,
  onSaveButaneWarehouses,
  butaneWarehouseMovements,
  onSaveButaneWarehouseMovements,
  butaneDistributors,
  onSaveButaneDistributors,
  butaneDistributorMovements,
  onSaveButaneDistributorMovements,
  onNotify,
}: InternalTradeEnergyAndComparisonViewProps) {
  const [villageFilter, setVillageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [crudModalState, setCrudModalState] = useState<{
    mode: 'view' | 'edit';
    title: string;
    record: Record<string, unknown>;
    fields: EditableFieldSpec[];
    onSave?: (updated: Record<string, unknown>) => void;
  } | null>(null);

  // إضافة سنة تاريخية جديدة للبوتاجاز أو البترول دون استبدال السنوات السابقة
  const [newYearNum, setNewYearNum] = useState<number>(2026);
  const [newYearTargetId, setNewYearTargetId] = useState<string>(butaneAllocations[0]?.id || '');
  const [newYearBeneficiaries, setNewYearBeneficiaries] = useState<number>(12400);
  const [newYearAllocated, setNewYearAllocated] = useState<number>(15000);
  const [newYearReceived, setNewYearReceived] = useState<number>(14800);
  const [newYearDistributed, setNewYearDistributed] = useState<number>(14500);

  // تبويب محطات الوقود الفرعي
  const [fuelSubTab, setFuelSubTab] = useState<'stations' | 'movements' | 'inspections'>('stations');
  const [showAddFuelMovModal, setShowAddFuelMovModal] = useState<boolean>(false);
  const [fmStationId, setFmStationId] = useState<string>(fuelStations[0]?.id || '');
  const [fmProduct, setFmProduct] = useState<PetroleumProductType>('سولار');
  const [fmOpening, setFmOpening] = useState<number>(15000);
  const [fmReceived, setFmReceived] = useState<number>(10000);
  const [fmPermit, setFmPermit] = useState<string>('إذن-شحن-٩٩٢٠١');
  const [fmSupplier, setFmSupplier] = useState<string>('مستودع طنطا البترولي');
  const [fmDispensed, setFmDispensed] = useState<number>(16000);
  const [fmAdjustments, setFmAdjustments] = useState<number>(0);
  const [fmActualTank, setFmActualTank] = useState<number>(9000);
  const [fmMeterStart, setFmMeterStart] = useState<number>(500000);
  const [fmMeterEnd, setFmMeterEnd] = useState<number>(516000);

  // حركة مستودع البوتاجاز
  const [showAddWhMovModal, setShowAddWhMovModal] = useState<boolean>(false);
  const [whmWarehouseId, setWhmWarehouseId] = useState<string>(butaneWarehouses[0]?.id || '');
  const [whmOpening, setWhmOpening] = useState<number>(800);
  const [whmReceived, setWhmReceived] = useState<number>(1100);
  const [whmSupplyPermit, setWhmSupplyPermit] = useState<string>('إذن-بتروجاس-٥٥٩٠٠');
  const [whmDispensed, setWhmDispensed] = useState<number>(950);
  const [whmDistributorPermitNo, setWhmDistributorPermitNo] = useState<string>('إذن-تسليم-موزعين-٩٥٥');
  const [whmReturned, setWhmReturned] = useState<number>(10);
  const [whmDamagedExcluded, setWhmDamagedExcluded] = useState<number>(10);
  const [whmActual, setWhmActual] = useState<number>(950);

  // حركة الموزع مرتبطة بإذن تسليم المستودع
  const [showAddDistMovModal, setShowAddDistMovModal] = useState<boolean>(false);
  const [dmDistributorId, setDmDistributorId] = useState<string>(butaneDistributors[0]?.id || '');
  const [dmPermitNo, setDmPermitNo] = useState<string>(
    butaneWarehouseMovements[0]?.deliveryPermitToDistributorNo || 'إذن-تسليم-موزعين-٩٠١'
  );
  const [dmPrevBalance, setDmPrevBalance] = useState<number>(20);
  const [dmReceived, setDmReceived] = useState<number>(250);
  const [dmDistributed, setDmDistributed] = useState<number>(245);
  const [dmReturned, setDmReturned] = useState<number>(5);
  const [dmDamaged, setDmDamaged] = useState<number>(5);

  // فلاتر شاشة المقارنة الإحصائية بين القرى والوحدات المحلية (١٥)
  const [compAxis, setCompAxis] = useState<
    'establishments' | 'campaigns' | 'markets' | 'butane' | 'petroleum'
  >('establishments');
  const [compAdminFilter, setCompAdminFilter] = useState<string>('ALL');
  const [compVillageFilter, setCompVillageFilter] = useState<string>('ALL');
  const [compYearFilter, setCompYearFilter] = useState<number>(2025);
  const [compFuelFilter, setCompFuelFilter] = useState<string>('ALL');
  const [compSortMetric, setCompSortMetric] = useState<string>('primaryCount');
  const [showPrintComparison, setShowPrintComparison] = useState<boolean>(false);

  const allVillages = useMemo(() => {
    const s = new Set<string>();
    establishments.forEach((e) => s.add(e.village));
    butaneAllocations.forEach((b) => s.add(b.village));
    return Array.from(s);
  }, [establishments, butaneAllocations]);

  // حساب إجمالي توزيع البوتاجاز الموحد مع منع ازدواجية الاحتساب بين المستودع والموزع
  const deduplicatedButaneDistributionSummary = useMemo(() => {
    const warehouseDispensedByPermit = new Map<string, number>();
    butaneWarehouseMovements
      .filter((m) => m.isApproved)
      .forEach((m) => {
        warehouseDispensedByPermit.set(m.deliveryPermitToDistributorNo, m.dispensedQuantity);
      });

    let totalWarehouseDispensed = 0;
    warehouseDispensedByPermit.forEach((v) => {
      totalWarehouseDispensed += v;
    });

    // الكميات التي سلمها الموزع للمواطنين تحت نفس رقم إذن المستودع هي تفصيل لتوزيع نفس الكمية وليست كمية إضافية فوق منصرف المستودع
    const linkedDistributorDistributed = butaneDistributorMovements
      .filter((m) => m.isApproved && warehouseDispensedByPermit.has(m.warehouseDeliveryPermitNo))
      .reduce((acc, m) => acc + m.distributedCylinders, 0);

    return {
      totalWarehouseDispensed,
      linkedDistributorDistributed,
      inTransitWithDistributors: Math.max(0, totalWarehouseDispensed - linkedDistributorDistributed),
    };
  }, [butaneWarehouseMovements, butaneDistributorMovements]);

  // إضافة سنة تاريخية جديدة لسجل البوتاجاز
  const handleAddButaneHistoricalYear = (e: React.FormEvent) => {
    e.preventDefault();
    const next = butaneAllocations.map((row) => {
      if (row.id !== newYearTargetId) return row;
      if (row.yearlyHistory.some((y) => y.year === newYearNum)) {
        onNotify(`بيانات عام ${toArabicNumerals(newYearNum)} مسجلة بالفعل لهذه القرية؛ لا يتم استبدال السجل التاريخي.`);
        return row;
      }
      return {
        ...row,
        yearlyHistory: [
          ...row.yearlyHistory,
          {
            year: newYearNum,
            beneficiariesCount: newYearBeneficiaries,
            allocatedCylinders: newYearAllocated,
            receivedCylinders: newYearReceived,
            distributedCylinders: newYearDistributed,
            remainingCylinders: Math.max(0, newYearReceived - newYearDistributed),
          },
        ].sort((a, b) => a.year - b.year),
      };
    });
    onSaveButaneAllocations(next);
    onNotify(`تم حفظ السجل التاريخي المستقل لعام ${toArabicNumerals(newYearNum)} بنجاح دون المساس بالأعوام السابقة.`);
  };

  // حفظ حركة يومية لمحطة وقود
  const handleSaveFuelMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const st = fuelStations.find((s) => s.id === fmStationId) || fuelStations[0];
    if (!st) return;
    const { bookClosingBalanceLiters, inventoryDiffLiters } = computeFuelStationClosingBalance({
      openingBalanceLiters: fmOpening,
      receivedQuantityLiters: fmReceived,
      dispensedQuantityLiters: fmDispensed,
      approvedAdjustmentsLiters: fmAdjustments,
      actualTankMeasurementLiters: fmActualTank,
    });
    const newRec: FuelStationDailyMovementRecord = {
      id: `fsm-${Date.now()}`,
      movementDate: todayRef,
      stationId: st.id,
      stationCode: st.stationCode,
      stationName: st.stationName,
      village: st.village,
      localUnit: st.localUnit,
      productType: fmProduct,
      openingBalanceLiters: fmOpening,
      receivedQuantityLiters: fmReceived,
      supplyPermitNumber: fmPermit,
      supplierEntity: fmSupplier,
      soldQuantityLiters: fmDispensed,
      dispensedQuantityLiters: fmDispensed,
      approvedAdjustmentsLiters: fmAdjustments,
      bookClosingBalanceLiters,
      actualTankMeasurementLiters: fmActualTank,
      meterReadingStart: fmMeterStart,
      meterReadingEnd: fmMeterEnd,
      inventoryDiffLiters,
      responsibleName: currentUserName,
      isApproved: true,
      notes:
        inventoryDiffLiters === 0
          ? 'مطابق للسجل الدفتري والعدادات'
          : `يوجد فرق جرد (${inventoryDiffLiters} لتر) يستوجب الفحص`,
    };
    onSaveFuelMovements([newRec, ...fuelMovements]);
    setShowAddFuelMovModal(false);
    onNotify('تم تسجيل واعتماد الحركة اليومية لمحطة الوقود وحساب الرصيد الختامي وفرق الجرد تلقائياً.');
  };

  // حفظ حركة مستودع بوتاجاز
  const handleSaveWarehouseMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const wh = butaneWarehouses.find((w) => w.id === whmWarehouseId) || butaneWarehouses[0];
    if (!wh) return;
    const { closingBalance, discrepancyDiff } = computeButaneWarehouseClosingBalance({
      openingBalance: whmOpening,
      receivedQuantity: whmReceived,
      dispensedQuantity: whmDispensed,
      returnedCylindersCount: whmReturned,
      excludedDamagedCylindersCount: whmDamagedExcluded,
      actualCount: whmActual,
    });
    const newRec: ButaneWarehouseMovementRecord = {
      id: `bwm-${Date.now()}`,
      movementDate: todayRef,
      warehouseId: wh.id,
      warehouseCode: wh.warehouseCode,
      warehouseName: wh.warehouseName,
      village: wh.village,
      openingBalance: whmOpening,
      receivedQuantity: whmReceived,
      supplyPermitNumber: whmSupplyPermit,
      supplierEntity: 'مصنع تعبئة بتروجاس بطنطا',
      dispensedQuantity: whmDispensed,
      deliveryPermitToDistributorNo: whmDistributorPermitNo,
      domesticCylindersCount: Math.round(whmDispensed * 0.9),
      commercialCylindersCount: Math.round(whmDispensed * 0.1),
      returnedCylindersCount: whmReturned,
      excludedDamagedCylindersCount: whmDamagedExcluded,
      damagedExclusionDocNo: 'مستند-فرز-معتمد',
      closingBalance,
      actualCount: whmActual,
      discrepancyDiff,
      responsibleName: currentUserName,
      isApproved: true,
    };
    onSaveButaneWarehouseMovements([newRec, ...butaneWarehouseMovements]);
    onSaveButaneWarehouses(
      butaneWarehouses.map((w) => (w.id === wh.id ? { ...w, currentCylindersCount: closingBalance } : w))
    );
    setShowAddWhMovModal(false);
    onNotify('تم تسجيل حركة المستودع وتحديث الرصيد الفعلي وربط إذن تسليم الموزعين.');
  };

  // حفظ حركة موزع مرتبطة بإذن تسليم المستودع
  const handleSaveDistributorMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const dist = butaneDistributors.find((d) => d.id === dmDistributorId) || butaneDistributors[0];
    if (!dist) return;
    const linkedWhMov = butaneWarehouseMovements.find(
      (m) => m.deliveryPermitToDistributorNo.trim() === dmPermitNo.trim()
    );
    if (!linkedWhMov) {
      onNotify('تنبيه: يجب ربط حركة الموزع برقم إذن تسليم مستودع معتمد وصحيح لمنع تكرار الاحتساب.');
      return;
    }
    const remainingBalance = computeDistributorRemainingBalance({
      previousBalance: dmPrevBalance,
      receivedCylinders: dmReceived,
      distributedCylinders: dmDistributed,
      approvedDamagedCylinders: dmDamaged,
      returnedCylinders: dmReturned,
    });
    const newRec: ButaneDistributorMovementRecord = {
      id: `bdm-${Date.now()}`,
      movementDate: todayRef,
      distributorId: dist.id,
      distributorName: dist.distributorName,
      warehouseId: dist.affiliatedWarehouseId,
      warehouseName: dist.affiliatedWarehouseName,
      warehouseDeliveryPermitNo: dmPermitNo,
      previousBalance: dmPrevBalance,
      receivedCylinders: dmReceived,
      distributedCylinders: dmDistributed,
      returnedCylinders: dmReturned,
      approvedDamagedCylinders: dmDamaged,
      remainingBalance,
      servedVillages: dist.assignedAreas,
      beneficiariesServedCount: dmDistributed,
      officialUnitPriceEgp: 150,
      receiptOrDeliveryDocNo: `كشف-توزيع-${Date.now().toString().slice(-4)}`,
      responsibleName: currentUserName,
      isApproved: true,
      notes: `مرتبط بإذن المستودع (${dmPermitNo}) — لا يتم احتساب الكمية مرتين`,
    };
    onSaveButaneDistributorMovements([newRec, ...butaneDistributorMovements]);
    setShowAddDistMovModal(false);
    onNotify('تم تسجيل حركة الموزع وربطها بإذن تسليم المستودع بنجاح.');
  };

  // ==================== أعمدة الجداول ====================

  const butaneEditableFields: EditableFieldSpec[] = useMemo(
    () => [
      { key: 'village', label: 'القرية' },
      { key: 'localUnit', label: 'الوحدة المحلية' },
      { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
      { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
      { key: 'licenseNumber', label: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
      { key: 'populationCount', label: 'عدد السكان', type: 'number' },
      { key: 'familiesCount', label: 'عدد الأسر', type: 'number' },
      { key: 'beneficiariesCountCurrent', label: 'المستفيدون المعتمدون', type: 'number' },
      { key: 'allocatedQuotaCylinders', label: 'الحصة المقررة (أسطوانة)', type: 'number' },
      { key: 'receivedQuantityCylinders', label: 'الكمية الواردة', type: 'number' },
      { key: 'distributedQuantityCylinders', label: 'الكمية الموزعة', type: 'number' },
      { key: 'remainingQuantityCylinders', label: 'المتبقي الفعلي', type: 'number' },
    ],
    []
  );

  const butaneColumns: SmartTableColumn<ButaneVillageAllocationRecord>[] = useMemo(
    () => [
      { key: 'village', label: 'القرية / الوحدة المحلية', headerText: 'القرية / الوحدة المحلية', type: 'name', defaultWidth: 175, render: (r) => <span className="font-black text-[#102A43]">{r.village} — {r.localUnit}</span> },
      { key: 'taxCardNumber', label: 'البطاقة الضريبية', headerText: 'البطاقة الضريبية', type: 'code', align: 'center', defaultWidth: 120, render: (r) => <span className="num-cell font-black text-[#102A43]">{r.taxCardNumber}</span> },
      { key: 'taxCardExpiryDate', label: 'انتهاء البطاقة الضريبية', headerText: 'انتهاء البطاقة الضريبية', type: 'date', align: 'center', defaultWidth: 130, render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.taxCardExpiryDate)}</span> },
      { key: 'commercialRegisterNumber', label: 'السجل التجاري', headerText: 'السجل التجاري', type: 'code', align: 'center', defaultWidth: 120, render: (r) => <span className="num-cell font-black text-[#102A43]">{r.commercialRegisterNumber}</span> },
      { key: 'commercialRegisterExpiryDate', label: 'انتهاء السجل التجاري', headerText: 'انتهاء السجل التجاري', type: 'date', align: 'center', defaultWidth: 130, render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.commercialRegisterExpiryDate)}</span> },
      { key: 'licenseNumber', label: 'رقم الترخيص', headerText: 'رقم الترخيص', type: 'code', align: 'center', defaultWidth: 120, render: (r) => <span className="num-cell font-black text-[#164E83]">{r.licenseNumber}</span> },
      { key: 'licenseExpiryDate', label: 'انتهاء الترخيص', headerText: 'انتهاء الترخيص', type: 'date', align: 'center', defaultWidth: 125, render: (r) => <span className="num-cell font-bold text-emerald-800">{formatDateArabic(r.licenseExpiryDate)}</span> },
      { key: 'populationCount', label: 'عدد السكان', headerText: 'عدد السكان', type: 'numeric', align: 'center', defaultWidth: 105, render: (r) => <span className="num-cell font-black">{formatArabicNumber(r.populationCount)}</span> },
      { key: 'familiesCount', label: 'عدد الأسر', headerText: 'عدد الأسر', type: 'numeric', align: 'center', defaultWidth: 100, render: (r) => <span className="num-cell font-bold">{formatArabicNumber(r.familiesCount)}</span> },
      { key: 'beneficiariesCountCurrent', label: 'المستفيدون المعتمدون', headerText: 'المستفيدون المعتمدون', type: 'numeric', align: 'center', defaultWidth: 125, render: (r) => <span className="num-cell font-black text-[#164E83]">{formatArabicNumber(r.beneficiariesCountCurrent)}</span> },
      { key: 'allocatedQuotaCylinders', label: 'الحصة المقررة', headerText: 'الحصة المقررة', type: 'numeric', align: 'center', defaultWidth: 115, render: (r) => <span className="num-cell font-black">{formatArabicNumber(r.allocatedQuotaCylinders)} أسطوانة</span> },
      { key: 'receivedQuantityCylinders', label: 'الكمية الواردة', headerText: 'الكمية الواردة', type: 'numeric', align: 'center', defaultWidth: 115, render: (r) => <span className="num-cell font-bold text-slate-800">{formatArabicNumber(r.receivedQuantityCylinders)}</span> },
      { key: 'distributedQuantityCylinders', label: 'الكمية الموزعة', headerText: 'الكمية الموزعة', type: 'numeric', align: 'center', defaultWidth: 115, render: (r) => <span className="num-cell font-black text-emerald-700">{formatArabicNumber(r.distributedQuantityCylinders)}</span> },
      { key: 'remainingQuantityCylinders', label: 'المتبقي الفعلي', headerText: 'المتبقي الفعلي', type: 'numeric', align: 'center', defaultWidth: 110, render: (r) => <span className="num-cell font-black text-amber-800">{formatArabicNumber(r.remainingQuantityCylinders)}</span> },
      {
        key: 'perCapita',
        label: 'نصيب الفرد/المستفيد',
        headerText: 'نصيب الفرد/المستفيد',
        type: 'numeric',
        align: 'center',
        defaultWidth: 155,
        render: (r) => {
          const share = computeButanePerCapitaShare({
            distributedCylinders: r.distributedQuantityCylinders,
            beneficiariesCount: r.beneficiariesCountCurrent,
            populationCount: r.populationCount,
            familiesCount: r.familiesCount,
            basis: settings.butanePerCapitaBasis,
            domesticCylinderWeightKg: settings.approvedDomesticCylinderWeightKg,
          });
          return share.valid ? (
            <span className="num-cell font-black text-[#102A43]">
              {formatArabicNumber(share.shareValue)} {share.unitLabel}
            </span>
          ) : (
            <span className="text-red-700 font-black text-[10px]">{share.warningMessage}</span>
          );
        },
      },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        align: 'center',
        defaultWidth: 235,
        render: (r) => (
          <TableActionButtons
            onView={() =>
              setCrudModalState({
                mode: 'view',
                title: `بيانات حصة ومستودعات بوتاجاز قرية: ${r.village}`,
                record: r as unknown as Record<string, unknown>,
                fields: butaneEditableFields,
              })
            }
            onAdd={() => {
              const newItem: ButaneVillageAllocationRecord = {
                ...r,
                id: `bva-${Date.now()}`,
                village: `${r.village} (قطاع جديد)`,
              };
              onSaveButaneAllocations([newItem, ...butaneAllocations]);
              onNotify(`تمت إضافة سجل حصة بوتاجاز جديد (${newItem.village}).`);
            }}
            onEdit={() =>
              setCrudModalState({
                mode: 'edit',
                title: `تعديل بيانات بوتاجاز قرية: ${r.village}`,
                record: r as unknown as Record<string, unknown>,
                fields: butaneEditableFields,
                onSave: (updated) => {
                  const next = butaneAllocations.map((x) =>
                    x.id === r.id ? ({ ...x, ...updated } as ButaneVillageAllocationRecord) : x
                  );
                  onSaveButaneAllocations(next);
                  onNotify(`تم تحديث سجل بوتاجاز قرية (${r.village}) بنجاح.`);
                },
              })
            }
            onDelete={() => {
              const next = butaneAllocations.filter((x) => x.id !== r.id);
              onSaveButaneAllocations(next);
              onNotify(`تم حذف سجل بوتاجاز قرية (${r.village}).`);
            }}
          />
        ),
      },
    ],
    [
      settings.butanePerCapitaBasis,
      settings.approvedDomesticCylinderWeightKg,
      butaneAllocations,
      butaneEditableFields,
      onSaveButaneAllocations,
      onNotify,
    ]
  );

  const petroleumEditableFields: EditableFieldSpec[] = useMemo(
    () => [
      { key: 'village', label: 'القرية' },
      { key: 'localUnit', label: 'الوحدة المحلية' },
      { key: 'productType', label: 'المنتج البترولي' },
      { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
      { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
      { key: 'licenseNumber', label: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
      { key: 'beneficiariesCountCurrent', label: 'عدد المستفيدين', type: 'number' },
      { key: 'openingBalance', label: 'الرصيد الافتتاحي', type: 'number' },
      { key: 'allocatedQuota', label: 'الحصة المقررة', type: 'number' },
      { key: 'receivedQuantity', label: 'الوارد المعتمد', type: 'number' },
      { key: 'distributedQuantity', label: 'المنصرف المعتمد', type: 'number' },
    ],
    []
  );

  const petroleumColumns: SmartTableColumn<PetroleumAllocationRecord>[] = useMemo(
    () => [
      { key: 'village', label: 'القرية / الوحدة', headerText: 'القرية / الوحدة', type: 'name', defaultWidth: 160, render: (r) => <span className="font-black text-[#102A43]">{r.village}</span> },
      { key: 'productType', label: 'المنتج البترولي', headerText: 'المنتج البترولي', type: 'status', align: 'center', defaultWidth: 115, render: (r) => <span className="font-black text-[#164E83]">{r.productType}</span> },
      { key: 'taxCardNumber', label: 'البطاقة الضريبية', headerText: 'البطاقة الضريبية', type: 'code', align: 'center', defaultWidth: 120, render: (r) => <span className="num-cell font-black text-[#102A43]">{r.taxCardNumber}</span> },
      { key: 'taxCardExpiryDate', label: 'انتهاء البطاقة الضريبية', headerText: 'انتهاء البطاقة الضريبية', type: 'date', align: 'center', defaultWidth: 130, render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.taxCardExpiryDate)}</span> },
      { key: 'commercialRegisterNumber', label: 'السجل التجاري', headerText: 'السجل التجاري', type: 'code', align: 'center', defaultWidth: 120, render: (r) => <span className="num-cell font-black text-[#102A43]">{r.commercialRegisterNumber}</span> },
      { key: 'commercialRegisterExpiryDate', label: 'انتهاء السجل التجاري', headerText: 'انتهاء السجل التجاري', type: 'date', align: 'center', defaultWidth: 130, render: (r) => <span className="num-cell font-bold">{formatDateArabic(r.commercialRegisterExpiryDate)}</span> },
      { key: 'licenseNumber', label: 'رقم الترخيص', headerText: 'رقم الترخيص', type: 'code', align: 'center', defaultWidth: 120, render: (r) => <span className="num-cell font-black text-[#164E83]">{r.licenseNumber}</span> },
      { key: 'licenseExpiryDate', label: 'انتهاء الترخيص', headerText: 'انتهاء الترخيص', type: 'date', align: 'center', defaultWidth: 125, render: (r) => <span className="num-cell font-bold text-emerald-800">{formatDateArabic(r.licenseExpiryDate)}</span> },
      { key: 'beneficiariesCountCurrent', label: 'عدد المستفيدين', headerText: 'عدد المستفيدين', type: 'numeric', align: 'center', defaultWidth: 115, render: (r) => <span className="num-cell font-black">{formatArabicNumber(r.beneficiariesCountCurrent)}</span> },
      { key: 'openingBalance', label: 'الرصيد الافتتاحي', headerText: 'الرصيد الافتتاحي', type: 'numeric', align: 'center', defaultWidth: 115, render: (r) => <span className="num-cell font-bold">{formatArabicNumber(r.openingBalance)} {r.unit}</span> },
      { key: 'allocatedQuota', label: 'الحصة المقررة', headerText: 'الحصة المقررة', type: 'numeric', align: 'center', defaultWidth: 120, render: (r) => <span className="num-cell font-black">{formatArabicNumber(r.allocatedQuota)} {r.unit}</span> },
      { key: 'receivedQuantity', label: 'الوارد المعتمد', headerText: 'الوارد المعتمد', type: 'numeric', align: 'center', defaultWidth: 120, render: (r) => <span className="num-cell font-bold text-slate-800">{formatArabicNumber(r.receivedQuantity)} {r.unit}</span> },
      { key: 'distributedQuantity', label: 'المنصرف المعتمد', headerText: 'المنصرف المعتمد', type: 'numeric', align: 'center', defaultWidth: 120, render: (r) => <span className="num-cell font-black text-emerald-700">{formatArabicNumber(r.distributedQuantity)} {r.unit}</span> },
      {
        key: 'remainingQuantity',
        label: 'الرصيد المتبقي المحسوب',
        headerText: 'الرصيد المتبقي المحسوب',
        type: 'numeric',
        align: 'center',
        defaultWidth: 140,
        render: (r) => {
          const m = computePetroleumMetrics({
            openingBalance: r.openingBalance,
            allocatedQuota: r.allocatedQuota,
            receivedQuantity: r.receivedQuantity,
            distributedQuantity: r.distributedQuantity,
            beneficiariesCount: r.beneficiariesCountCurrent,
          });
          return <span className="num-cell font-black text-[#102A43]">{formatArabicNumber(m.remainingQuantity)} {r.unit}</span>;
        },
      },
      {
        key: 'distPct',
        label: 'نسبة التوزيع ٪',
        headerText: 'نسبة التوزيع ٪',
        type: 'percentage',
        align: 'center',
        defaultWidth: 115,
        render: (r) => {
          const m = computePetroleumMetrics({
            openingBalance: r.openingBalance,
            allocatedQuota: r.allocatedQuota,
            receivedQuantity: r.receivedQuantity,
            distributedQuantity: r.distributedQuantity,
            beneficiariesCount: r.beneficiariesCountCurrent,
          });
          return <span className="num-cell font-black text-emerald-800">{formatArabicNumber(m.distributionPercentage)}٪</span>;
        },
      },
      {
        key: 'perBeneficiary',
        label: 'مؤشر نصيب المستفيد',
        headerText: 'مؤشر نصيب المستفيد',
        type: 'numeric',
        align: 'center',
        defaultWidth: 145,
        render: (r) => {
          const m = computePetroleumMetrics({
            openingBalance: r.openingBalance,
            allocatedQuota: r.allocatedQuota,
            receivedQuantity: r.receivedQuantity,
            distributedQuantity: r.distributedQuantity,
            beneficiariesCount: r.beneficiariesCountCurrent,
          });
          return m.incompleteBeneficiariesWarning ? (
            <span className="text-red-700 font-black text-[10px]">بيانات المستفيدين غير مكتملة</span>
          ) : (
            <span className="num-cell font-black text-[#164E83]">{formatArabicNumber(m.perBeneficiaryShare || 0)} {r.unit}/مستفيد</span>
          );
        },
      },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        align: 'center',
        defaultWidth: 235,
        render: (r) => (
          <TableActionButtons
            onView={() =>
              setCrudModalState({
                mode: 'view',
                title: `بيانات المواد البترولية: ${r.village} (${r.productType})`,
                record: r as unknown as Record<string, unknown>,
                fields: petroleumEditableFields,
              })
            }
            onAdd={() => {
              const newItem: PetroleumAllocationRecord = {
                ...r,
                id: `pa-${Date.now()}`,
                village: `${r.village} (حصة إضافية)`,
              };
              onSavePetroleumAllocations([newItem, ...petroleumAllocations]);
              onNotify(`تمت إضافة سجل حصة مواد بترولية جديد (${newItem.village}).`);
            }}
            onEdit={() =>
              setCrudModalState({
                mode: 'edit',
                title: `تعديل المواد البترولية: ${r.village} (${r.productType})`,
                record: r as unknown as Record<string, unknown>,
                fields: petroleumEditableFields,
                onSave: (updated) => {
                  const next = petroleumAllocations.map((x) =>
                    x.id === r.id ? ({ ...x, ...updated } as PetroleumAllocationRecord) : x
                  );
                  onSavePetroleumAllocations(next);
                  onNotify(`تم تحديث سجل المواد البترولية (${r.village}) بنجاح.`);
                },
              })
            }
            onDelete={() => {
              const next = petroleumAllocations.filter((x) => x.id !== r.id);
              onSavePetroleumAllocations(next);
              onNotify(`تم حذف سجل المواد البترولية (${r.village}).`);
            }}
          />
        ),
      },
    ],
    [petroleumAllocations, petroleumEditableFields, onSavePetroleumAllocations, onNotify]
  );

  // بيانات المقارنة الإحصائية بين القرى والوحدات المحلية (١٥)
  const villageComparisonRows = useMemo(() => {
    const villagesToCompare = allVillages.filter(
      (v) => compVillageFilter === 'ALL' || v === compVillageFilter
    );
    const rows = villagesToCompare.map((v) => {
      const vEsts = establishments.filter((e) => e.village === v);
      const vLicensed = vEsts.filter((e) => e.isLicensed).length;
      const vUnlicensed = vEsts.length - vLicensed;
      const vLics = licenses.filter((l) => l.village === v);
      const vExpiredLics = vLics.filter((l) => l.status === 'منتهي').length;

      const vCamps = campaigns.filter((c) => c.village === v);
      const vReps = reports.filter((r) => r.village === v);
      const vStls = settlements.filter((s) => s.village === v);
      const vCollectedEgp = vStls.reduce((acc, s) => acc + s.paidAmountEgp, 0);
      const vRemainingEgp = vStls.reduce((acc, s) => acc + s.remainingAmountEgp, 0);

      const vObs = priceObservations.filter((o) => o.village === v);
      const vAvgPrice =
        vObs.length > 0 ? round2(vObs.reduce((a, b) => a + b.observedPriceEgp, 0) / vObs.length) : 0;
      const vMinPrice = vObs.length > 0 ? Math.min(...vObs.map((o) => o.minPriceEgp)) : 0;
      const vMaxPrice = vObs.length > 0 ? Math.max(...vObs.map((o) => o.maxPriceEgp)) : 0;

      const vButane = butaneAllocations.find((b) => b.village === v);
      const bYear = vButane?.yearlyHistory.find((y) => y.year === compYearFilter);
      const bPrevYear = vButane?.yearlyHistory.find((y) => y.year === compYearFilter - 1);
      const bShare =
        bYear && bYear.beneficiariesCount > 0
          ? round2(bYear.distributedCylinders / bYear.beneficiariesCount)
          : 0;
      const bAnnualChangePct =
        bYear && bPrevYear && bPrevYear.distributedCylinders > 0
          ? round2(
              ((bYear.distributedCylinders - bPrevYear.distributedCylinders) /
                bPrevYear.distributedCylinders) *
                100
            )
          : 0;

      const vPets = petroleumAllocations.filter(
        (p) => p.village === v && (compFuelFilter === 'ALL' || p.productType === compFuelFilter)
      );
      const pDistributed = vPets.reduce((a, b) => a + b.distributedQuantity, 0);
      const pBeneficiaries = vPets.reduce((a, b) => a + b.beneficiariesCountCurrent, 0);
      const pShare = pBeneficiaries > 0 ? round2(pDistributed / pBeneficiaries) : 0;

      let primaryCount = vEsts.length;
      if (compAxis === 'campaigns') primaryCount = vReps.length;
      if (compAxis === 'markets') primaryCount = vAvgPrice;
      if (compAxis === 'butane') primaryCount = bYear?.distributedCylinders || 0;
      if (compAxis === 'petroleum') primaryCount = pDistributed;

      return {
        village: v,
        localUnit: vEsts[0]?.localUnit || vButane?.localUnit || `الوحدة المحلية بـ ${v}`,
        supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
        establishmentsCount: vEsts.length,
        licensedCount: vLicensed,
        unlicensedCount: vUnlicensed,
        expiredLicensesCount: vExpiredLics,
        campaignsCount: vCamps.length,
        reportsCount: vReps.length,
        settlementsCount: vStls.length,
        collectedAmountEgp: vCollectedEgp,
        remainingAmountEgp: vRemainingEgp,
        avgCommodityPriceEgp: vAvgPrice,
        minCommodityPriceEgp: vMinPrice,
        maxCommodityPriceEgp: vMaxPrice,
        butaneBeneficiaries: bYear?.beneficiariesCount || 0,
        butaneAllocated: bYear?.allocatedCylinders || 0,
        butaneDistributed: bYear?.distributedCylinders || 0,
        butanePerCapita: bShare,
        butaneAnnualChangePct: bAnnualChangePct,
        petroleumBeneficiaries: pBeneficiaries,
        petroleumDistributed: pDistributed,
        petroleumPerBeneficiary: pShare,
        primaryCount,
      };
    });

    return [...rows].sort((a, b) => {
      if (compSortMetric === 'butanePerCapita') return b.butanePerCapita - a.butanePerCapita;
      if (compSortMetric === 'reportsCount') return b.reportsCount - a.reportsCount;
      if (compSortMetric === 'avgCommodityPriceEgp') return b.avgCommodityPriceEgp - a.avgCommodityPriceEgp;
      return b.primaryCount - a.primaryCount;
    });
  }, [
    allVillages,
    compVillageFilter,
    establishments,
    licenses,
    campaigns,
    reports,
    settlements,
    priceObservations,
    butaneAllocations,
    compYearFilter,
    petroleumAllocations,
    compFuelFilter,
    compAxis,
    compSortMetric,
  ]);

  // ==================== ١٠ و ١١. شاشات البوتاجاز ونصيب الفرد والمقارنة السنوية ====================
  if (activeScreen === 'butane_management' || activeScreen === 'butane_beneficiaries') {
    const filteredButane = butaneAllocations.filter(
      (b) =>
        (villageFilter === 'ALL' || b.village === villageFilter) &&
        (!searchQuery || b.village.includes(searchQuery) || b.localUnit.includes(searchQuery))
    );

    return (
      <div className="space-y-4">
        {/* شريط إعداد أساس احتساب نصيب الفرد من البوتاجاز */}
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43]">
              {activeScreen === 'butane_management'
                ? '١٠. إدارة ومتابعة أسطوانات البوتاجاز بالقرى والوحدات المحلية'
                : '١١. نصيب الفرد والمستفيدون من البوتاجاز والمقارنة التاريخية (٢٠٢٣ – ٢٠٢٤ – ٢٠٢٥)'}
            </h3>
            <p className="text-[11px] font-bold text-slate-600 mt-0.5">
              المعادلة الموحدة: نصيب الفرد = إجمالي الكمية الموزعة المعتمدة ÷ عدد المستفيدين المعتمدين (مع فصل وحدات الأسطوانة عن الكيلوجرام بوزن معتمد {toArabicNumerals(settings.approvedDomesticCylinderWeightKg)} كجم)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-black text-[#102A43]">أساس احتساب نصيب الفرد:</label>
            <select
              value={settings.butanePerCapitaBasis}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  butanePerCapitaBasis: e.target.value as InternalTradeSettings['butanePerCapitaBasis'],
                })
              }
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-black text-[#102A43] bg-slate-50"
            >
              <option value="للمستفيد بالأسطوانة">للمستفيد بالأسطوانة</option>
              <option value="للفرد بالأسطوانة">للفرد (إجمالي السكان) بالأسطوانة</option>
              <option value="للأسرة بالأسطوانة">للأسرة بالأسطوانة</option>
              <option value="للمستفيد بالكيلوجرام">للمستفيد بالكيلوجرام (وزن ١٢٫٥ كجم معتمد)</option>
            </select>
            <button
              type="button"
              onClick={() => {
                exportCsvUtf8Bom(
                  'سجل_حصص_ومستفيدي_البوتاجاز.csv',
                  ['القرية', 'الوحدة المحلية', 'السكان', 'الأسر', 'المستفيدون', 'الحصة المقررة', 'الوارد', 'الموزع', 'المتبقي'],
                  filteredButane.map((r) => [
                    r.village,
                    r.localUnit,
                    r.populationCount,
                    r.familiesCount,
                    r.beneficiariesCountCurrent,
                    r.allocatedQuotaCylinders,
                    r.receivedQuantityCylinders,
                    r.distributedQuantityCylinders,
                    r.remainingQuantityCylinders,
                  ])
                );
                onNotify('تم تصدير سجل البوتاجاز ونصيب الفرد إلى ملف Excel (UTF-8).');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>

        {/* جدول حصص البوتاجاز */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-[#102A43]">سجل الحصص والكميات الواردة والموزعة ونصيب الفرد</span>
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-black"
            >
              <option value="ALL">جميع القرى والوحدات المحلية</option>
              {allVillages.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <SmartAutoFitTable
            tableId="internal_trade_butane_allocations"
            userId={userId}
            rows={filteredButane}
            totalCount={butaneAllocations.length}
            getRowId={(r) => r.id}
            columns={butaneColumns}
            onNotify={onNotify}
          />
        </div>

        {/* جدول المقارنة التاريخية بين الأعوام 2023 و2024 و2025 وإضافة أعوام جديدة */}
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-xs font-black text-[#102A43]">
                شاشة المقارنة السنوية للمستفيدين والحصص ونصيب الفرد (٢٠٢٣ – ٢٠٢٤ – ٢٠٢٥ والسنوات المضافة)
              </h4>
              <p className="text-[11px] font-bold text-slate-600">
                يحتفظ النظام بسجل تاريخي مستقل لكل سنة دون استبدال بيانات سنة سابقة عند إضافة عام جديد
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700">القرية / الوحدة</th>
                  <th className="p-2.5 border border-slate-700 text-center">البطاقة الضريبية (وانتهاؤها)</th>
                  <th className="p-2.5 border border-slate-700 text-center">السجل التجاري (وانتهاؤه)</th>
                  <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص (وانتهاؤه)</th>
                  <th className="p-2.5 border border-slate-700 text-center">السنة</th>
                  <th className="p-2.5 border border-slate-700 text-center">عدد المستفيدين</th>
                  <th className="p-2.5 border border-slate-700 text-center">الحصة المقررة</th>
                  <th className="p-2.5 border border-slate-700 text-center">الكمية الواردة</th>
                  <th className="p-2.5 border border-slate-700 text-center">الكمية الموزعة</th>
                  <th className="p-2.5 border border-slate-700 text-center">المتبقي</th>
                  <th className="p-2.5 border border-slate-700 text-center">نصيب المستفيد</th>
                  <th className="p-2.5 border border-slate-700 text-center">التغير السنوي ٪</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredButane.map((row) =>
                  row.yearlyHistory.map((yh, idx) => {
                    const prev = idx > 0 ? row.yearlyHistory[idx - 1] : null;
                    const diffCyl = prev ? yh.distributedCylinders - prev.distributedCylinders : 0;
                    const pctChange =
                      prev && prev.distributedCylinders > 0
                        ? round2((diffCyl / prev.distributedCylinders) * 100)
                        : 0;
                    const share =
                      yh.beneficiariesCount > 0
                        ? round2(yh.distributedCylinders / yh.beneficiariesCount)
                        : 0;
                    const yhFields: EditableFieldSpec[] = [
                      { key: 'year', label: 'السنة', type: 'number' },
                      { key: 'beneficiariesCount', label: 'عدد المستفيدين', type: 'number' },
                      { key: 'allocatedCylinders', label: 'الحصة المقررة', type: 'number' },
                      { key: 'receivedCylinders', label: 'الكمية الواردة', type: 'number' },
                      { key: 'distributedCylinders', label: 'الكمية الموزعة', type: 'number' },
                      { key: 'remainingCylinders', label: 'المتبقي', type: 'number' },
                    ];
                    return (
                      <tr key={`${row.id}-${yh.year}`} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5 font-black text-[#102A43]">{row.village}</td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#102A43] block">{row.taxCardNumber}</span>
                          <span className="text-[10px] text-slate-500">{formatDateArabic(row.taxCardExpiryDate)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#102A43] block">{row.commercialRegisterNumber}</span>
                          <span className="text-[10px] text-slate-500">{formatDateArabic(row.commercialRegisterExpiryDate)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#164E83] block">{row.licenseNumber}</span>
                          <span className="text-[10px] text-emerald-700">{formatDateArabic(row.licenseExpiryDate)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-black text-[#164E83]">
                          {toArabicNumerals(yh.year)}
                        </td>
                        <td className="p-2.5 text-center num-cell font-black">
                          {formatArabicNumber(yh.beneficiariesCount)}
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          {formatArabicNumber(yh.allocatedCylinders)}
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          {formatArabicNumber(yh.receivedCylinders)}
                        </td>
                        <td className="p-2.5 text-center num-cell font-black text-emerald-700">
                          {formatArabicNumber(yh.distributedCylinders)}
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold text-amber-800">
                          {formatArabicNumber(yh.remainingCylinders)}
                        </td>
                        <td className="p-2.5 text-center num-cell font-black text-[#102A43]">
                          {formatArabicNumber(share)} أسطوانة
                        </td>
                        <td className="p-2.5 text-center num-cell font-black">
                          {prev ? (
                            <span className={pctChange >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                              {pctChange >= 0 ? '+' : ''}
                              {formatArabicNumber(pctChange)}٪
                            </span>
                          ) : (
                            <span className="text-slate-400">سنة أساس</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <TableActionButtons
                            onView={() =>
                              setCrudModalState({
                                mode: 'view',
                                title: `سجل البوتاجاز السنوي: ${row.village} (${yh.year})`,
                                record: { ...row, ...yh } as unknown as Record<string, unknown>,
                                fields: [...butaneEditableFields, ...yhFields],
                              })
                            }
                            onAdd={() => {
                              setNewYearTargetId(row.id);
                              setNewYearNum(yh.year + 1);
                            }}
                            onEdit={() =>
                              setCrudModalState({
                                mode: 'edit',
                                title: `تعديل سجل البوتاجاز السنوي: ${row.village} (${yh.year})`,
                                record: yh as unknown as Record<string, unknown>,
                                fields: yhFields,
                                onSave: (updated) => {
                                  const next = butaneAllocations.map((b) =>
                                    b.id === row.id
                                      ? {
                                          ...b,
                                          yearlyHistory: b.yearlyHistory.map((y) =>
                                            y.year === yh.year ? ({ ...y, ...updated } as typeof yh) : y
                                          ),
                                        }
                                      : b
                                  );
                                  onSaveButaneAllocations(next);
                                  onNotify(`تم تحديث بيانات عام ${toArabicNumerals(yh.year)} لقرية ${row.village}.`);
                                },
                              })
                            }
                            onDelete={() => {
                              const next = butaneAllocations.map((b) =>
                                b.id === row.id
                                  ? {
                                      ...b,
                                      yearlyHistory: b.yearlyHistory.filter((y) => y.year !== yh.year),
                                    }
                                  : b
                              );
                              onSaveButaneAllocations(next);
                              onNotify(`تم حذف سجل عام ${toArabicNumerals(yh.year)} لقرية ${row.village}.`);
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* نموذج إضافة سنة جديدة كسجل تاريخي مستقل */}
          <form
            onSubmit={handleAddButaneHistoricalYear}
            className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end"
          >
            <div>
              <label className="text-[10.5px] font-black text-slate-700 block mb-1">القرية</label>
              <select
                value={newYearTargetId}
                onChange={(e) => setNewYearTargetId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
              >
                {butaneAllocations.map((b) => (
                  <option key={b.id} value={b.id}>{b.village}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10.5px] font-black text-slate-700 block mb-1">السنة الجديدة</label>
              <input
                type="number"
                value={newYearNum}
                onChange={(e) => setNewYearNum(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-black bg-white"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-black text-slate-700 block mb-1">عدد المستفيدين</label>
              <input
                type="number"
                value={newYearBeneficiaries}
                onChange={(e) => setNewYearBeneficiaries(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-black bg-white"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-black text-slate-700 block mb-1">الحصة المقررة</label>
              <input
                type="number"
                value={newYearAllocated}
                onChange={(e) => setNewYearAllocated(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-black bg-white"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-black text-slate-700 block mb-1">الموزع الفعلي</label>
              <input
                type="number"
                value={newYearDistributed}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setNewYearDistributed(val);
                  setNewYearReceived(Math.max(val, newYearReceived));
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-black bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة سنة تاريخية مستقلة</span>
            </button>
          </form>
        </div>

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
      </div>
    );
  }

  // ==================== ١٢ و ١٣. شاشات المواد البترولية ونصيب المستفيد ====================
  if (activeScreen === 'petroleum_management' || activeScreen === 'petroleum_beneficiaries') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43]">
              {activeScreen === 'petroleum_management'
                ? '١٢. إدارة ومتابعة المواد البترولية (بنزين 80 / 92 / 95 — سولار — كيروسين)'
                : '١٣. نصيب المستفيد والإحصاءات السنوية للمواد البترولية (٢٠٢٣ – ٢٠٢٤ – ٢٠٢٥)'}
            </h3>
            <p className="text-[11px] font-bold text-slate-600 mt-0.5">
              المتبقي = الرصيد الافتتاحي + الوارد المعتمد - المنصرف المعتمد · نسبة التوزيع = الكمية الموزعة ÷ الحصة المقررة × ١٠٠ · نصيب المستفيد مؤشر إحصائي استرشادي
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              exportCsvUtf8Bom(
                'سجل_المواد_البترولية_ونصيب_المستفيد.csv',
                ['القرية', 'المنتج', 'البطاقة الضريبية', 'انتهاء البطاقة', 'السجل التجاري', 'انتهاء السجل', 'رقم الترخيص', 'انتهاء الترخيص', 'المستفيدون', 'الرصيد الافتتاحي', 'الحصة المقررة', 'الوارد', 'المنصرف', 'المتبقي'],
                petroleumAllocations.map((p) => [
                  p.village,
                  p.productType,
                  p.taxCardNumber,
                  p.taxCardExpiryDate,
                  p.commercialRegisterNumber,
                  p.commercialRegisterExpiryDate,
                  p.licenseNumber,
                  p.licenseExpiryDate,
                  p.beneficiariesCountCurrent,
                  p.openingBalance,
                  p.allocatedQuota,
                  p.receivedQuantity,
                  p.distributedQuantity,
                  p.remainingQuantity,
                ])
              );
              onNotify('تم تصدير بيانات المواد البترولية بنجاح.');
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير Excel</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <SmartAutoFitTable
            tableId="internal_trade_petroleum_allocations"
            userId={userId}
            rows={petroleumAllocations}
            totalCount={petroleumAllocations.length}
            getRowId={(r) => r.id}
            columns={petroleumColumns}
            onNotify={onNotify}
          />
        </div>

        {/* جدول المقارنة السنوية للمواد البترولية 2023 و2024 و2025 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h4 className="text-xs font-black text-[#102A43]">
            سجل المقارنة السنوية لمستفيدي وحصص المواد البترولية (٢٠٢٣ – ٢٠٢٤ – ٢٠٢٥)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700">القرية</th>
                  <th className="p-2.5 border border-slate-700">المنتج البترولي</th>
                  <th className="p-2.5 border border-slate-700 text-center">البطاقة الضريبية (وانتهاؤها)</th>
                  <th className="p-2.5 border border-slate-700 text-center">السجل التجاري (وانتهاؤه)</th>
                  <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص (وانتهاؤه)</th>
                  <th className="p-2.5 border border-slate-700 text-center">السنة</th>
                  <th className="p-2.5 border border-slate-700 text-center">عدد المستفيدين</th>
                  <th className="p-2.5 border border-slate-700 text-center">الحصة المقررة</th>
                  <th className="p-2.5 border border-slate-700 text-center">المنصرف المعتمد</th>
                  <th className="p-2.5 border border-slate-700 text-center">مؤشر نصيب المستفيد</th>
                  <th className="p-2.5 border border-slate-700 text-center">التغير السنوي</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {petroleumAllocations.map((row) =>
                  row.yearlyHistory.map((yh, idx) => {
                    const prev = idx > 0 ? row.yearlyHistory[idx - 1] : null;
                    const annualDiff = prev ? yh.distributedQuantity - prev.distributedQuantity : 0;
                    const share =
                      yh.beneficiariesCount > 0
                        ? round2(yh.distributedQuantity / yh.beneficiariesCount)
                        : null;
                    const pyhFields: EditableFieldSpec[] = [
                      { key: 'year', label: 'السنة', type: 'number' },
                      { key: 'beneficiariesCount', label: 'عدد المستفيدين', type: 'number' },
                      { key: 'allocatedQuantity', label: 'الحصة المقررة', type: 'number' },
                      { key: 'receivedQuantity', label: 'الوارد المعتمد', type: 'number' },
                      { key: 'distributedQuantity', label: 'المنصرف المعتمد', type: 'number' },
                      { key: 'remainingQuantity', label: 'المتبقي', type: 'number' },
                    ];
                    return (
                      <tr key={`${row.id}-${yh.year}`} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5 font-black text-[#102A43]">{row.village}</td>
                        <td className="p-2.5 font-bold text-[#164E83]">{row.productType}</td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#102A43] block">{row.taxCardNumber}</span>
                          <span className="text-[10px] text-slate-500">{formatDateArabic(row.taxCardExpiryDate)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#102A43] block">{row.commercialRegisterNumber}</span>
                          <span className="text-[10px] text-slate-500">{formatDateArabic(row.commercialRegisterExpiryDate)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#164E83] block">{row.licenseNumber}</span>
                          <span className="text-[10px] text-emerald-700">{formatDateArabic(row.licenseExpiryDate)}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-black">{toArabicNumerals(yh.year)}</td>
                        <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(yh.beneficiariesCount)}</td>
                        <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(yh.allocatedQuantity)} {row.unit}</td>
                        <td className="p-2.5 text-center num-cell font-black text-emerald-700">{formatArabicNumber(yh.distributedQuantity)} {row.unit}</td>
                        <td className="p-2.5 text-center num-cell font-black text-[#102A43]">
                          {share !== null ? `${formatArabicNumber(share)} ${row.unit}` : 'بيانات غير مكتملة'}
                        </td>
                        <td className="p-2.5 text-center num-cell font-black">
                          {prev ? (
                            <span className={annualDiff >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                              {annualDiff >= 0 ? '+' : ''}
                              {formatArabicNumber(annualDiff)} {row.unit}
                            </span>
                          ) : (
                            <span className="text-slate-400">سنة أساس</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <TableActionButtons
                            onView={() =>
                              setCrudModalState({
                                mode: 'view',
                                title: `سجل الوقود السنوي: ${row.village} (${row.productType} - ${yh.year})`,
                                record: { ...row, ...yh } as unknown as Record<string, unknown>,
                                fields: [...petroleumEditableFields, ...pyhFields],
                              })
                            }
                            onAdd={() => {
                              const nextYear = yh.year + 1;
                              if (row.yearlyHistory.some((y) => y.year === nextYear)) {
                                onNotify(`سنة ${toArabicNumerals(nextYear)} مسجلة بالفعل.`);
                                return;
                              }
                              const next = petroleumAllocations.map((p) =>
                                p.id === row.id
                                  ? {
                                      ...p,
                                      yearlyHistory: [...p.yearlyHistory, { ...yh, year: nextYear }].sort(
                                        (a, b) => a.year - b.year
                                      ),
                                    }
                                  : p
                              );
                              onSavePetroleumAllocations(next);
                              onNotify(`تمت إضافة سجل عام ${toArabicNumerals(nextYear)} لقرية ${row.village}.`);
                            }}
                            onEdit={() =>
                              setCrudModalState({
                                mode: 'edit',
                                title: `تعديل سجل الوقود السنوي: ${row.village} (${yh.year})`,
                                record: yh as unknown as Record<string, unknown>,
                                fields: pyhFields,
                                onSave: (updated) => {
                                  const next = petroleumAllocations.map((p) =>
                                    p.id === row.id
                                      ? {
                                          ...p,
                                          yearlyHistory: p.yearlyHistory.map((y) =>
                                            y.year === yh.year ? ({ ...y, ...updated } as typeof yh) : y
                                          ),
                                        }
                                      : p
                                  );
                                  onSavePetroleumAllocations(next);
                                  onNotify(`تم تحديث بيانات عام ${toArabicNumerals(yh.year)} لقرية ${row.village}.`);
                                },
                              })
                            }
                            onDelete={() => {
                              const next = petroleumAllocations.map((p) =>
                                p.id === row.id
                                  ? {
                                      ...p,
                                      yearlyHistory: p.yearlyHistory.filter((y) => y.year !== yh.year),
                                    }
                                  : p
                              );
                              onSavePetroleumAllocations(next);
                              onNotify(`تم حذف سجل عام ${toArabicNumerals(yh.year)} لقرية ${row.village}.`);
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

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
      </div>
    );
  }

  // ==================== ١٤. شاشة متابعة محطات الوقود والرقابة اليومية ====================
  if (activeScreen === 'fuel_stations') {
    const fuelStationFields: EditableFieldSpec[] = [
      { key: 'stationCode', label: 'كود المحطة' },
      { key: 'stationName', label: 'اسم المحطة' },
      { key: 'operatingCompany', label: 'الشركة المشغلة' },
      { key: 'ownerOrManagerName', label: 'اسم المالك / المدير المسؤول' },
      { key: 'village', label: 'القرية' },
      { key: 'localUnit', label: 'الوحدة المحلية' },
      { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
      { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
      { key: 'licenseNumber', label: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
      { key: 'pumpsCount', label: 'عدد الطلمبات', type: 'number' },
      { key: 'totalTanksCapacityLiters', label: 'سعة الخزانات (لتر)', type: 'number' },
      { key: 'operationStatus', label: 'حالة التشغيل' },
    ];

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43]">
              ١٤. متابعة محطات الوقود وتجار المواد البترولية ودفتر الحركة اليومية (سجل ٢١ بترول)
            </h3>
            <p className="text-[11px] font-bold text-slate-600 mt-0.5">
              يتضمن البطاقة الضريبية والسجل التجاري ورقم الترخيص وتاريخ انتهاء كل منها مع أزرار الإجراءات الكاملة
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFuelSubTab('stations')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                fuelSubTab === 'stations' ? 'bg-[#102A43] text-[#C6A15B]' : 'bg-slate-100 text-slate-700'
              }`}
            >
              سجل محطات الوقود ({toArabicNumerals(fuelStations.length)})
            </button>
            <button
              type="button"
              onClick={() => setFuelSubTab('movements')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                fuelSubTab === 'movements' ? 'bg-[#102A43] text-[#C6A15B]' : 'bg-slate-100 text-slate-700'
              }`}
            >
              دفتر الحركة اليومية سجل ٢١ بترول ({toArabicNumerals(fuelMovements.length)})
            </button>
            <button
              type="button"
              onClick={() => setFuelSubTab('inspections')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                fuelSubTab === 'inspections' ? 'bg-[#102A43] text-[#C6A15B]' : 'bg-slate-100 text-slate-700'
              }`}
            >
              سجل المرور والتفتيش والمعايرة ({toArabicNumerals(fuelInspections.length)})
            </button>
            <button
              type="button"
              onClick={() => setShowAddFuelMovModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تسجيل حركة يومية (سجل ٢١ بترول)</span>
            </button>
          </div>
        </div>

        {fuelSubTab === 'stations' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#102A43]">
                جدول سجل محطات الوقود وتجار المواد البترولية (شامل البطاقة الضريبية والسجل التجاري والترخيص وتواريخ الانتهاء)
              </h4>
              <button
                type="button"
                onClick={() => {
                  const base = fuelStations[0];
                  if (!base) return;
                  const newStation: FuelStationRecord = {
                    ...base,
                    id: `fs-${Date.now()}`,
                    stationCode: `FS-GH-2026-0${fuelStations.length + 1}`,
                    stationName: 'محطة تموين وقود جديدة',
                  };
                  onSaveFuelStations([newStation, ...fuelStations]);
                  onNotify(`تمت إضافة محطة وقود جديدة (${newStation.stationCode}).`);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة محطة وقود جديدة</span>
              </button>
            </div>
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700">كود المحطة</th>
                  <th className="p-2.5 border border-slate-700">اسم المحطة والشركة</th>
                  <th className="p-2.5 border border-slate-700">المالك / المسؤول والقرية</th>
                  <th className="p-2.5 border border-slate-700 text-center">رقم البطاقة الضريبية</th>
                  <th className="p-2.5 border border-slate-700 text-center">انتهاء البطاقة الضريبية</th>
                  <th className="p-2.5 border border-slate-700 text-center">رقم السجل التجاري</th>
                  <th className="p-2.5 border border-slate-700 text-center">انتهاء السجل التجاري</th>
                  <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص</th>
                  <th className="p-2.5 border border-slate-700 text-center">انتهاء الترخيص</th>
                  <th className="p-2.5 border border-slate-700 text-center">الطلمبات والسعة</th>
                  <th className="p-2.5 border border-slate-700 text-center">الحالة</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {fuelStations.map((fs) => (
                  <tr key={fs.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2.5 font-black text-[#164E83]">{fs.stationCode}</td>
                    <td className="p-2.5">
                      <span className="font-black text-[#102A43] block">{fs.stationName}</span>
                      <span className="text-[10.5px] font-bold text-slate-500">{fs.operatingCompany}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="font-black text-slate-800 block">{fs.ownerOrManagerName}</span>
                      <span className="text-[10.5px] font-bold text-slate-500">{fs.village}</span>
                    </td>
                    <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{fs.taxCardNumber}</td>
                    <td className="p-2.5 text-center num-cell font-bold">{formatDateArabic(fs.taxCardExpiryDate)}</td>
                    <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{fs.commercialRegisterNumber}</td>
                    <td className="p-2.5 text-center num-cell font-bold">{formatDateArabic(fs.commercialRegisterExpiryDate)}</td>
                    <td className="p-2.5 text-center num-cell font-black text-[#164E83]">{fs.licenseNumber}</td>
                    <td className="p-2.5 text-center num-cell font-bold text-emerald-800">{formatDateArabic(fs.licenseExpiryDate)}</td>
                    <td className="p-2.5 text-center num-cell font-bold">
                      {toArabicNumerals(fs.pumpsCount)} طلمبات · {formatArabicNumber(fs.totalTanksCapacityLiters)} لتر
                    </td>
                    <td className="p-2.5 text-center font-black text-emerald-800">{fs.operationStatus}</td>
                    <td className="p-2.5 text-center">
                      <TableActionButtons
                        onView={() =>
                          setCrudModalState({
                            mode: 'view',
                            title: `بيانات محطة الوقود: ${fs.stationName}`,
                            record: fs as unknown as Record<string, unknown>,
                            fields: fuelStationFields,
                          })
                        }
                        onAdd={() => {
                          const newStation: FuelStationRecord = {
                            ...fs,
                            id: `fs-${Date.now()}`,
                            stationCode: `FS-GH-2026-0${fuelStations.length + 1}`,
                            stationName: `${fs.stationName} (فرع جديد)`,
                          };
                          onSaveFuelStations([newStation, ...fuelStations]);
                          onNotify(`تمت إضافة محطة وقود جديدة (${newStation.stationCode}).`);
                        }}
                        onEdit={() =>
                          setCrudModalState({
                            mode: 'edit',
                            title: `تعديل بيانات محطة الوقود: ${fs.stationName}`,
                            record: fs as unknown as Record<string, unknown>,
                            fields: fuelStationFields,
                            onSave: (updated) => {
                              const next = fuelStations.map((x) =>
                                x.id === fs.id ? ({ ...x, ...updated } as FuelStationRecord) : x
                              );
                              onSaveFuelStations(next);
                              onNotify(`تم تحديث بيانات المحطة (${fs.stationName}) بنجاح.`);
                            },
                          })
                        }
                        onDelete={() => {
                          const next = fuelStations.filter((x) => x.id !== fs.id);
                          onSaveFuelStations(next);
                          onNotify(`تم حذف محطة الوقود (${fs.stationName}).`);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {fuelSubTab === 'movements' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700">التاريخ</th>
                  <th className="p-2.5 border border-slate-700">المحطة</th>
                  <th className="p-2.5 border border-slate-700 text-center">البطاقة الضريبية (وانتهاؤها)</th>
                  <th className="p-2.5 border border-slate-700 text-center">السجل التجاري (وانتهاؤه)</th>
                  <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص (وانتهاؤه)</th>
                  <th className="p-2.5 border border-slate-700 text-center">المنتج</th>
                  <th className="p-2.5 border border-slate-700 text-center">رصيد افتتاحي</th>
                  <th className="p-2.5 border border-slate-700 text-center">الوارد (ورقم الإذن)</th>
                  <th className="p-2.5 border border-slate-700 text-center">المنصرف</th>
                  <th className="p-2.5 border border-slate-700 text-center">الرصيد الدفتري الختامي</th>
                  <th className="p-2.5 border border-slate-700 text-center">القياس الفعلي</th>
                  <th className="p-2.5 border border-slate-700 text-center">فرق الجرد</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {fuelMovements.map((m) => {
                  const st = fuelStations.find((s) => s.id === m.stationId) || fuelStations[0];
                  const fmFields: EditableFieldSpec[] = [
                    { key: 'movementDate', label: 'تاريخ الحركة', type: 'date' },
                    { key: 'stationName', label: 'اسم المحطة' },
                    { key: 'productType', label: 'المنتج البترولي' },
                    { key: 'openingBalanceLiters', label: 'الرصيد الافتتاحي (لتر)', type: 'number' },
                    { key: 'receivedQuantityLiters', label: 'الوارد (لتر)', type: 'number' },
                    { key: 'supplyPermitNumber', label: 'رقم إذن التوريد' },
                    { key: 'dispensedQuantityLiters', label: 'المنصرف (لتر)', type: 'number' },
                    { key: 'bookClosingBalanceLiters', label: 'الرصيد الدفتري الختامي', type: 'number' },
                    { key: 'actualTankMeasurementLiters', label: 'القياس الفعلي للخزان', type: 'number' },
                    { key: 'inventoryDiffLiters', label: 'فرق الجرد', type: 'number' },
                  ];
                  return (
                    <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 num-cell font-bold">{formatDateArabic(m.movementDate)}</td>
                      <td className="p-2.5 font-black text-[#102A43]">{m.stationName}</td>
                      <td className="p-2.5 text-center num-cell font-bold">
                        <span className="font-black text-[#102A43] block">{st?.taxCardNumber || '—'}</span>
                        <span className="text-[10px] text-slate-500">{st ? formatDateArabic(st.taxCardExpiryDate) : '—'}</span>
                      </td>
                      <td className="p-2.5 text-center num-cell font-bold">
                        <span className="font-black text-[#102A43] block">{st?.commercialRegisterNumber || '—'}</span>
                        <span className="text-[10px] text-slate-500">{st ? formatDateArabic(st.commercialRegisterExpiryDate) : '—'}</span>
                      </td>
                      <td className="p-2.5 text-center num-cell font-bold">
                        <span className="font-black text-[#164E83] block">{st?.licenseNumber || '—'}</span>
                        <span className="text-[10px] text-emerald-700">{st ? formatDateArabic(st.licenseExpiryDate) : '—'}</span>
                      </td>
                      <td className="p-2.5 text-center font-black text-[#164E83]">{m.productType}</td>
                      <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(m.openingBalanceLiters)}</td>
                      <td className="p-2.5 text-center num-cell font-bold">
                        {formatArabicNumber(m.receivedQuantityLiters)} لتر ({m.supplyPermitNumber})
                      </td>
                      <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(m.dispensedQuantityLiters)}</td>
                      <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{formatArabicNumber(m.bookClosingBalanceLiters)} لتر</td>
                      <td className="p-2.5 text-center num-cell font-black">{formatArabicNumber(m.actualTankMeasurementLiters)} لتر</td>
                      <td className="p-2.5 text-center num-cell font-black">
                        <span className={m.inventoryDiffLiters === 0 ? 'text-emerald-700' : 'text-red-700'}>
                          {formatArabicNumber(m.inventoryDiffLiters)} لتر
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          onView={() =>
                            setCrudModalState({
                              mode: 'view',
                              title: `حركة سجل ٢١ بترول: ${m.stationName}`,
                              record: { ...st, ...m } as unknown as Record<string, unknown>,
                              fields: [...fuelStationFields, ...fmFields],
                            })
                          }
                          onAdd={() => setShowAddFuelMovModal(true)}
                          onEdit={() =>
                            setCrudModalState({
                              mode: 'edit',
                              title: `تعديل حركة سجل ٢١ بترول: ${m.stationName}`,
                              record: m as unknown as Record<string, unknown>,
                              fields: fmFields,
                              onSave: (updated) => {
                                const next = fuelMovements.map((x) =>
                                  x.id === m.id ? ({ ...x, ...updated } as FuelStationDailyMovementRecord) : x
                                );
                                onSaveFuelMovements(next);
                                onNotify('تم تحديث حركة سجل ٢١ بترول بنجاح.');
                              },
                            })
                          }
                          onDelete={() => {
                            const next = fuelMovements.filter((x) => x.id !== m.id);
                            onSaveFuelMovements(next);
                            onNotify('تم حذف سجل الحركة اليومية.');
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {fuelSubTab === 'inspections' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700">تاريخ المرور</th>
                  <th className="p-2.5 border border-slate-700">المحطة</th>
                  <th className="p-2.5 border border-slate-700 text-center">البطاقة الضريبية (وانتهاؤها)</th>
                  <th className="p-2.5 border border-slate-700 text-center">السجل التجاري (وانتهاؤه)</th>
                  <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص (وانتهاؤه)</th>
                  <th className="p-2.5 border border-slate-700">المفتش</th>
                  <th className="p-2.5 border border-slate-700 text-center">المنتج</th>
                  <th className="p-2.5 border border-slate-700 text-center">مطابقة الدفتري</th>
                  <th className="p-2.5 border border-slate-700 text-center">حالة المعايرة والطلمبات</th>
                  <th className="p-2.5 border border-slate-700">المخالفات ورقم المحضر</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {fuelInspections.map((ins) => {
                  const st = fuelStations.find((s) => s.id === ins.stationId) || fuelStations[0];
                  const insFields: EditableFieldSpec[] = [
                    { key: 'inspectionDate', label: 'تاريخ المرور', type: 'date' },
                    { key: 'stationName', label: 'اسم المحطة' },
                    { key: 'inspectorName', label: 'المفتش' },
                    { key: 'productType', label: 'المنتج' },
                    { key: 'calibrationStatus', label: 'حالة المعايرة' },
                    { key: 'pumpsCondition', label: 'حالة الطلمبات' },
                    { key: 'violationsFound', label: 'المخالفات المرصودة' },
                    { key: 'reportNumber', label: 'رقم المحضر' },
                  ];
                  return (
                    <tr key={ins.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 num-cell font-bold">{formatDateArabic(ins.inspectionDate)}</td>
                      <td className="p-2.5 font-black text-[#102A43]">{ins.stationName}</td>
                      <td className="p-2.5 text-center num-cell font-bold">
                        <span className="font-black text-[#102A43] block">{st?.taxCardNumber || '—'}</span>
                        <span className="text-[10px] text-slate-500">{st ? formatDateArabic(st.taxCardExpiryDate) : '—'}</span>
                      </td>
                      <td className="p-2.5 text-center num-cell font-bold">
                        <span className="font-black text-[#102A43] block">{st?.commercialRegisterNumber || '—'}</span>
                        <span className="text-[10px] text-slate-500">{st ? formatDateArabic(st.commercialRegisterExpiryDate) : '—'}</span>
                      </td>
                      <td className="p-2.5 text-center num-cell font-bold">
                        <span className="font-black text-[#164E83] block">{st?.licenseNumber || '—'}</span>
                        <span className="text-[10px] text-emerald-700">{st ? formatDateArabic(st.licenseExpiryDate) : '—'}</span>
                      </td>
                      <td className="p-2.5 font-bold">{ins.inspectorName}</td>
                      <td className="p-2.5 text-center font-black">{ins.productType}</td>
                      <td className="p-2.5 text-center font-black">
                        <span className={ins.bookBalanceMatched ? 'text-emerald-700' : 'text-red-700'}>
                          {ins.bookBalanceMatched ? 'مطابق' : 'يوجد عجز/فرق'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-bold">{ins.calibrationStatus} · {ins.pumpsCondition}</td>
                      <td className="p-2.5 font-bold text-red-800">{ins.violationsFound} ({ins.reportNumber || '—'})</td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          onView={() =>
                            setCrudModalState({
                              mode: 'view',
                              title: `تفتيش ومعايرة محطة: ${ins.stationName}`,
                              record: { ...st, ...ins } as unknown as Record<string, unknown>,
                              fields: [...fuelStationFields, ...insFields],
                            })
                          }
                          onAdd={() => {
                            const newIns: FuelStationInspectionRecord = {
                              ...ins,
                              id: `fsi-${Date.now()}`,
                              inspectionDate: todayRef,
                            };
                            onSaveFuelInspections([newIns, ...fuelInspections]);
                            onNotify('تمت إضافة سجل تفتيش ومعايرة جديد للمحطة.');
                          }}
                          onEdit={() =>
                            setCrudModalState({
                              mode: 'edit',
                              title: `تعديل تفتيش محطة: ${ins.stationName}`,
                              record: ins as unknown as Record<string, unknown>,
                              fields: insFields,
                              onSave: (updated) => {
                                const next = fuelInspections.map((x) =>
                                  x.id === ins.id ? ({ ...x, ...updated } as FuelStationInspectionRecord) : x
                                );
                                onSaveFuelInspections(next);
                                onNotify('تم تحديث سجل التفتيش والمعايرة بنجاح.');
                              },
                            })
                          }
                          onDelete={() => {
                            const next = fuelInspections.filter((x) => x.id !== ins.id);
                            onSaveFuelInspections(next);
                            onNotify('تم حذف سجل التفتيش.');
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showAddFuelMovModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveFuelMovement}
              className="bg-white rounded-2xl border-2 border-[#102A43] max-w-xl w-full p-5 space-y-3 text-xs"
            >
              <h4 className="text-sm font-black text-[#102A43] border-b pb-2">
                تسجيل حركة يومية بمحطة وقود (دفتر سجل ٢١ بترول)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-black block mb-1">المحطة</label>
                  <select
                    value={fmStationId}
                    onChange={(e) => setFmStationId(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg font-bold"
                  >
                    {fuelStations.map((s) => (
                      <option key={s.id} value={s.id}>{s.stationName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-black block mb-1">المنتج البترولي</label>
                  <select
                    value={fmProduct}
                    onChange={(e) => setFmProduct(e.target.value as PetroleumProductType)}
                    className="w-full px-3 py-1.5 border rounded-lg font-bold"
                  >
                    <option value="سولار">سولار</option>
                    <option value="بنزين 80">بنزين 80</option>
                    <option value="بنزين 92">بنزين 92</option>
                    <option value="بنزين 95">بنزين 95</option>
                  </select>
                </div>
                <div>
                  <label className="font-black block mb-1">الرصيد الافتتاحي (لتر)</label>
                  <input type="number" value={fmOpening} onChange={(e) => setFmOpening(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">الكمية الواردة (لتر)</label>
                  <input type="number" value={fmReceived} onChange={(e) => setFmReceived(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">رقم إذن التوريد</label>
                  <input type="text" value={fmPermit} onChange={(e) => setFmPermit(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
                </div>
                <div>
                  <label className="font-black block mb-1">الكمية المنصرفة / المباعة (لتر)</label>
                  <input type="number" value={fmDispensed} onChange={(e) => setFmDispensed(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">التسويات المعتمدة (± لتر)</label>
                  <input type="number" value={fmAdjustments} onChange={(e) => setFmAdjustments(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">القياس الفعلي للخزان (لتر)</label>
                  <input type="number" value={fmActualTank} onChange={(e) => setFmActualTank(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddFuelMovModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">حفظ واعتماد الحركة</button>
              </div>
            </form>
          </div>
        )}

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
      </div>
    );
  }

  // ==================== ١٥ و ١٦. مستودعات البوتاجاز وسجل الموزعين ====================
  if (activeScreen === 'butane_warehouses' || activeScreen === 'butane_distributors') {
    const warehouseFields: EditableFieldSpec[] = [
      { key: 'warehouseCode', label: 'كود المستودع' },
      { key: 'warehouseName', label: 'اسم المستودع' },
      { key: 'ownerName', label: 'اسم المالك / التاجر' },
      { key: 'managerName', label: 'المدير المسؤول' },
      { key: 'village', label: 'القرية' },
      { key: 'localUnit', label: 'الوحدة المحلية' },
      { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
      { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
      { key: 'licenseNumber', label: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
      { key: 'storageCapacityCylinders', label: 'الطاقة التخزينية', type: 'number' },
      { key: 'currentCylindersCount', label: 'الرصيد الحالي', type: 'number' },
      { key: 'allocatedMonthlyQuota', label: 'الحصة الشهرية المقررة', type: 'number' },
      { key: 'distributedMonthlyQuantity', label: 'الموزع الشهري', type: 'number' },
    ];

    const distributorFields: EditableFieldSpec[] = [
      { key: 'distributorCode', label: 'كود الموزع' },
      { key: 'distributorName', label: 'اسم الموزع / التاجر' },
      { key: 'affiliatedWarehouseName', label: 'المستودع التابع له' },
      { key: 'village', label: 'القرية' },
      { key: 'assignedAreas', label: 'مناطق التوزيع' },
      { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
      { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
      { key: 'licenseNumber', label: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
      { key: 'transportMode', label: 'وسيلة النقل' },
      { key: 'vehiclePlateNumber', label: 'رقم المركبة' },
      { key: 'allocatedCylindersQuota', label: 'الحصة المخصصة', type: 'number' },
      { key: 'status', label: 'الحالة' },
    ];

    return (
      <div className="space-y-4">
        {/* بطاقة منع ازدواجية الاحتساب بين المستودع والموزع */}
        <div className="bg-[#102A43] text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-black text-[#C6A15B] block">
              ضابط الرقابة الموحدة ومنع ازدواجية احتساب الكميات
            </span>
            <h3 className="text-sm font-black">
              {activeScreen === 'butane_warehouses'
                ? '١٥. سجل تجار ومستودعات البوتاجاز ودفتر الحركة اليومية ومتابعة التوزيع'
                : '١٦. سجل تجار وموزعي أسطوانات البوتاجاز وحركتهم اليومية المرتبطة بأذون المستودعات'}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-slate-300 block text-[10.5px]">إجمالي منصرف المستودعات المعتمد</span>
              <span className="num-cell font-black text-[#C6A15B] text-sm">
                {formatArabicNumber(deduplicatedButaneDistributionSummary.totalWarehouseDispensed)} أسطوانة
              </span>
            </div>
            <div>
              <span className="text-slate-300 block text-[10.5px]">الموزع للمواطنين عبر الموزعين المرتبطين</span>
              <span className="num-cell font-black text-emerald-400 text-sm">
                {formatArabicNumber(deduplicatedButaneDistributionSummary.linkedDistributorDistributed)} أسطوانة
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                activeScreen === 'butane_warehouses'
                  ? setShowAddWhMovModal(true)
                  : setShowAddDistMovModal(true)
              }
              className="px-3.5 py-2 rounded-xl bg-[#C6A15B] text-[#102A43] font-black flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {activeScreen === 'butane_warehouses'
                  ? 'تسجيل حركة يومية للمستودع'
                  : 'تسجيل حركة موزع مرتبطة بإذن مستودع'}
              </span>
            </button>
          </div>
        </div>

        {activeScreen === 'butane_warehouses' ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#102A43]">
                  سجل تجار ومستودعات البوتاجاز (شامل البطاقة الضريبية والسجل التجاري ورقم الترخيص وتاريخ انتهاء كل منها)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const base = butaneWarehouses[0];
                    if (!base) return;
                    const newWh: ButaneWarehouseRecord = {
                      ...base,
                      id: `bw-${Date.now()}`,
                      warehouseCode: `BW-GH-2026-0${butaneWarehouses.length + 1}`,
                      warehouseName: 'مستودع بوتاجاز جديد',
                    };
                    onSaveButaneWarehouses([newWh, ...butaneWarehouses]);
                    onNotify(`تمت إضافة مستودع بوتاجاز جديد (${newWh.warehouseCode}).`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مستودع بوتاجاز جديد</span>
                </button>
              </div>
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">كود المستودع</th>
                    <th className="p-2.5 border border-slate-700">اسم المستودع والقرية</th>
                    <th className="p-2.5 border border-slate-700">المالك / المسؤول</th>
                    <th className="p-2.5 border border-slate-700 text-center">رقم البطاقة الضريبية</th>
                    <th className="p-2.5 border border-slate-700 text-center">انتهاء البطاقة الضريبية</th>
                    <th className="p-2.5 border border-slate-700 text-center">رقم السجل التجاري</th>
                    <th className="p-2.5 border border-slate-700 text-center">انتهاء السجل التجاري</th>
                    <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص</th>
                    <th className="p-2.5 border border-slate-700 text-center">انتهاء الترخيص</th>
                    <th className="p-2.5 border border-slate-700 text-center">الرصيد الحالي / السعة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الحصة الشهرية / الموزع</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {butaneWarehouses.map((bw) => (
                    <tr key={bw.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 font-black text-[#164E83]">{bw.warehouseCode}</td>
                      <td className="p-2.5">
                        <span className="font-black text-[#102A43] block">{bw.warehouseName}</span>
                        <span className="text-[10.5px] font-bold text-slate-500">{bw.village} — {bw.localUnit}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-black text-slate-800 block">{bw.ownerName}</span>
                        <span className="text-[10.5px] font-bold text-slate-500">إدارة: {bw.managerName}</span>
                      </td>
                      <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{bw.taxCardNumber}</td>
                      <td className="p-2.5 text-center num-cell font-bold">{formatDateArabic(bw.taxCardExpiryDate)}</td>
                      <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{bw.commercialRegisterNumber}</td>
                      <td className="p-2.5 text-center num-cell font-bold">{formatDateArabic(bw.commercialRegisterExpiryDate)}</td>
                      <td className="p-2.5 text-center num-cell font-black text-[#164E83]">{bw.licenseNumber}</td>
                      <td className="p-2.5 text-center num-cell font-bold text-emerald-800">{formatDateArabic(bw.licenseExpiryDate)}</td>
                      <td className="p-2.5 text-center num-cell font-black">
                        {formatArabicNumber(bw.currentCylindersCount)} / {formatArabicNumber(bw.storageCapacityCylinders)}
                      </td>
                      <td className="p-2.5 text-center num-cell font-black text-emerald-700">
                        {formatArabicNumber(bw.distributedMonthlyQuantity)} / {formatArabicNumber(bw.allocatedMonthlyQuota)}
                      </td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          onView={() =>
                            setCrudModalState({
                              mode: 'view',
                              title: `بيانات مستودع البوتاجاز: ${bw.warehouseName}`,
                              record: bw as unknown as Record<string, unknown>,
                              fields: warehouseFields,
                            })
                          }
                          onAdd={() => {
                            const newWh: ButaneWarehouseRecord = {
                              ...bw,
                              id: `bw-${Date.now()}`,
                              warehouseCode: `BW-GH-2026-0${butaneWarehouses.length + 1}`,
                              warehouseName: `${bw.warehouseName} (جديد)`,
                            };
                            onSaveButaneWarehouses([newWh, ...butaneWarehouses]);
                            onNotify(`تمت إضافة مستودع البوتاجاز (${newWh.warehouseCode}).`);
                          }}
                          onEdit={() =>
                            setCrudModalState({
                              mode: 'edit',
                              title: `تعديل بيانات مستودع البوتاجاز: ${bw.warehouseName}`,
                              record: bw as unknown as Record<string, unknown>,
                              fields: warehouseFields,
                              onSave: (updated) => {
                                const next = butaneWarehouses.map((x) =>
                                  x.id === bw.id ? ({ ...x, ...updated } as ButaneWarehouseRecord) : x
                                );
                                onSaveButaneWarehouses(next);
                                onNotify(`تم تحديث بيانات المستودع (${bw.warehouseName}) بنجاح.`);
                              },
                            })
                          }
                          onDelete={() => {
                            const next = butaneWarehouses.filter((x) => x.id !== bw.id);
                            onSaveButaneWarehouses(next);
                            onNotify(`تم حذف المستودع (${bw.warehouseName}).`);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto space-y-2">
              <h4 className="text-xs font-black text-[#102A43]">
                دفتر الحركة اليومية للمستودعات (الرصيد الختامي = الافتتاحي + الوارد - المنصرف + المرتجع - التالف المستبعد بمستند)
              </h4>
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">التاريخ</th>
                    <th className="p-2.5 border border-slate-700">المستودع</th>
                    <th className="p-2.5 border border-slate-700 text-center">البطاقة الضريبية (وانتهاؤها)</th>
                    <th className="p-2.5 border border-slate-700 text-center">السجل التجاري (وانتهاؤه)</th>
                    <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص (وانتهاؤه)</th>
                    <th className="p-2.5 border border-slate-700 text-center">الافتتاحي</th>
                    <th className="p-2.5 border border-slate-700 text-center">الوارد (إذن التوريد)</th>
                    <th className="p-2.5 border border-slate-700 text-center">المنصرف للموزعين</th>
                    <th className="p-2.5 border border-slate-700 text-center">رقم إذن التسليم</th>
                    <th className="p-2.5 border border-slate-700 text-center">مرتجع / تالف</th>
                    <th className="p-2.5 border border-slate-700 text-center">الرصيد الختامي</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {butaneWarehouseMovements.map((m) => {
                    const wh = butaneWarehouses.find((w) => w.id === m.warehouseId) || butaneWarehouses[0];
                    const whmFields: EditableFieldSpec[] = [
                      { key: 'movementDate', label: 'التاريخ', type: 'date' },
                      { key: 'warehouseName', label: 'المستودع' },
                      { key: 'openingBalance', label: 'الرصيد الافتتاحي', type: 'number' },
                      { key: 'receivedQuantity', label: 'الوارد', type: 'number' },
                      { key: 'supplyPermitNumber', label: 'رقم إذن التوريد' },
                      { key: 'dispensedQuantity', label: 'المنصرف للموزعين', type: 'number' },
                      { key: 'deliveryPermitToDistributorNo', label: 'رقم إذن التسليم للموزعين' },
                      { key: 'closingBalance', label: 'الرصيد الختامي', type: 'number' },
                    ];
                    return (
                      <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5 num-cell font-bold">{formatDateArabic(m.movementDate)}</td>
                        <td className="p-2.5 font-black text-[#102A43]">{m.warehouseName}</td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#102A43] block">{wh?.taxCardNumber || '—'}</span>
                          <span className="text-[10px] text-slate-500">{wh ? formatDateArabic(wh.taxCardExpiryDate) : '—'}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#102A43] block">{wh?.commercialRegisterNumber || '—'}</span>
                          <span className="text-[10px] text-slate-500">{wh ? formatDateArabic(wh.commercialRegisterExpiryDate) : '—'}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#164E83] block">{wh?.licenseNumber || '—'}</span>
                          <span className="text-[10px] text-emerald-700">{wh ? formatDateArabic(wh.licenseExpiryDate) : '—'}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(m.openingBalance)}</td>
                        <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(m.receivedQuantity)} ({m.supplyPermitNumber})</td>
                        <td className="p-2.5 text-center num-cell font-black text-emerald-700">{formatArabicNumber(m.dispensedQuantity)}</td>
                        <td className="p-2.5 text-center font-black text-[#164E83]">{m.deliveryPermitToDistributorNo}</td>
                        <td className="p-2.5 text-center num-cell font-bold">+{formatArabicNumber(m.returnedCylindersCount)} / -{formatArabicNumber(m.excludedDamagedCylindersCount)}</td>
                        <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{formatArabicNumber(m.closingBalance)} أسطوانة</td>
                        <td className="p-2.5 text-center">
                          <TableActionButtons
                            onView={() =>
                              setCrudModalState({
                                mode: 'view',
                                title: `حركة مستودع البوتاجاز: ${m.warehouseName}`,
                                record: { ...wh, ...m } as unknown as Record<string, unknown>,
                                fields: [...warehouseFields, ...whmFields],
                              })
                            }
                            onAdd={() => setShowAddWhMovModal(true)}
                            onEdit={() =>
                              setCrudModalState({
                                mode: 'edit',
                                title: `تعديل حركة مستودع البوتاجاز: ${m.warehouseName}`,
                                record: m as unknown as Record<string, unknown>,
                                fields: whmFields,
                                onSave: (updated) => {
                                  const next = butaneWarehouseMovements.map((x) =>
                                    x.id === m.id ? ({ ...x, ...updated } as ButaneWarehouseMovementRecord) : x
                                  );
                                  onSaveButaneWarehouseMovements(next);
                                  onNotify('تم تحديث حركة المستودع بنجاح.');
                                },
                              })
                            }
                            onDelete={() => {
                              const next = butaneWarehouseMovements.filter((x) => x.id !== m.id);
                              onSaveButaneWarehouseMovements(next);
                              onNotify('تم حذف حركة المستودع.');
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#102A43]">
                  سجل تجار وموزعي أسطوانات البوتاجاز المعتمدين (شامل البطاقة الضريبية والسجل التجاري ورقم الترخيص وتواريخ الانتهاء)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const base = butaneDistributors[0];
                    if (!base) return;
                    const newDist: ButaneDistributorRecord = {
                      ...base,
                      id: `bd-${Date.now()}`,
                      distributorCode: `DIST-GH-0${butaneDistributors.length + 1}`,
                      distributorName: 'موزع بوتاجاز معتمد جديد',
                    };
                    onSaveButaneDistributors([newDist, ...butaneDistributors]);
                    onNotify(`تمت إضافة موزع بوتاجاز جديد (${newDist.distributorCode}).`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة موزع جديد</span>
                </button>
              </div>
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">كود الموزع</th>
                    <th className="p-2.5 border border-slate-700">اسم الموزع</th>
                    <th className="p-2.5 border border-slate-700">المستودع التابع له</th>
                    <th className="p-2.5 border border-slate-700 text-center">رقم البطاقة الضريبية</th>
                    <th className="p-2.5 border border-slate-700 text-center">انتهاء البطاقة الضريبية</th>
                    <th className="p-2.5 border border-slate-700 text-center">رقم السجل التجاري</th>
                    <th className="p-2.5 border border-slate-700 text-center">انتهاء السجل التجاري</th>
                    <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص</th>
                    <th className="p-2.5 border border-slate-700 text-center">انتهاء الترخيص</th>
                    <th className="p-2.5 border border-slate-700">مناطق التوزيع</th>
                    <th className="p-2.5 border border-slate-700 text-center">الحصة المخصصة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الحالة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {butaneDistributors.map((d) => (
                    <tr key={d.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 font-black text-[#164E83]">{d.distributorCode}</td>
                      <td className="p-2.5 font-black text-[#102A43]">{d.distributorName}</td>
                      <td className="p-2.5 font-bold">{d.affiliatedWarehouseName}</td>
                      <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{d.taxCardNumber}</td>
                      <td className="p-2.5 text-center num-cell font-bold">{formatDateArabic(d.taxCardExpiryDate)}</td>
                      <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{d.commercialRegisterNumber}</td>
                      <td className="p-2.5 text-center num-cell font-bold">{formatDateArabic(d.commercialRegisterExpiryDate)}</td>
                      <td className="p-2.5 text-center num-cell font-black text-[#164E83]">{d.permitOrLicenseNumber}</td>
                      <td className="p-2.5 text-center num-cell font-bold text-emerald-800">{formatDateArabic(d.licenseExpiryDate)}</td>
                      <td className="p-2.5 font-bold">{d.assignedAreas}</td>
                      <td className="p-2.5 text-center num-cell font-black">{formatArabicNumber(d.allocatedCylindersQuota)} أسطوانة</td>
                      <td className="p-2.5 text-center font-black text-emerald-700">{d.status}</td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          onView={() =>
                            setCrudModalState({
                              mode: 'view',
                              title: `بيانات موزع البوتاجاز: ${d.distributorName}`,
                              record: d as unknown as Record<string, unknown>,
                              fields: distributorFields,
                            })
                          }
                          onAdd={() => {
                            const newDist: ButaneDistributorRecord = {
                              ...d,
                              id: `bd-${Date.now()}`,
                              distributorCode: `DIST-GH-0${butaneDistributors.length + 1}`,
                              distributorName: `${d.distributorName} (جديد)`,
                            };
                            onSaveButaneDistributors([newDist, ...butaneDistributors]);
                            onNotify(`تمت إضافة موزع البوتاجاز (${newDist.distributorCode}).`);
                          }}
                          onEdit={() =>
                            setCrudModalState({
                              mode: 'edit',
                              title: `تعديل بيانات موزع البوتاجاز: ${d.distributorName}`,
                              record: d as unknown as Record<string, unknown>,
                              fields: distributorFields,
                              onSave: (updated) => {
                                const next = butaneDistributors.map((x) =>
                                  x.id === d.id ? ({ ...x, ...updated } as ButaneDistributorRecord) : x
                                );
                                onSaveButaneDistributors(next);
                                onNotify(`تم تحديث بيانات الموزع (${d.distributorName}) بنجاح.`);
                              },
                            })
                          }
                          onDelete={() => {
                            const next = butaneDistributors.filter((x) => x.id !== d.id);
                            onSaveButaneDistributors(next);
                            onNotify(`تم حذف الموزع (${d.distributorName}).`);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto space-y-2">
              <h4 className="text-xs font-black text-[#102A43]">
                دفتر الحركة اليومية للموزعين (مرتبط بإذن تسليم المستودع لمنع تكرار الاحتساب)
              </h4>
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">التاريخ</th>
                    <th className="p-2.5 border border-slate-700">الموزع</th>
                    <th className="p-2.5 border border-slate-700 text-center">البطاقة الضريبية (وانتهاؤها)</th>
                    <th className="p-2.5 border border-slate-700 text-center">السجل التجاري (وانتهاؤه)</th>
                    <th className="p-2.5 border border-slate-700 text-center">رقم الترخيص (وانتهاؤه)</th>
                    <th className="p-2.5 border border-slate-700 text-center">إذن تسليم المستودع المرتبط</th>
                    <th className="p-2.5 border border-slate-700 text-center">الرصيد السابق</th>
                    <th className="p-2.5 border border-slate-700 text-center">المستلم</th>
                    <th className="p-2.5 border border-slate-700 text-center">الموزع للمواطنين</th>
                    <th className="p-2.5 border border-slate-700 text-center">مرتجع (+) / تالف (-)</th>
                    <th className="p-2.5 border border-slate-700 text-center">الرصيد المتبقي</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {butaneDistributorMovements.map((m) => {
                    const dist = butaneDistributors.find((d) => d.id === m.distributorId) || butaneDistributors[0];
                    const bdmFields: EditableFieldSpec[] = [
                      { key: 'movementDate', label: 'التاريخ', type: 'date' },
                      { key: 'distributorName', label: 'اسم الموزع' },
                      { key: 'warehouseDeliveryPermitNo', label: 'إذن تسليم المستودع المرتبط' },
                      { key: 'previousBalance', label: 'الرصيد السابق', type: 'number' },
                      { key: 'receivedCylinders', label: 'المستلم', type: 'number' },
                      { key: 'distributedCylinders', label: 'الموزع للمواطنين', type: 'number' },
                      { key: 'remainingBalance', label: 'الرصيد المتبقي', type: 'number' },
                    ];
                    return (
                      <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5 num-cell font-bold">{formatDateArabic(m.movementDate)}</td>
                        <td className="p-2.5 font-black text-[#102A43]">{m.distributorName}</td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#102A43] block">{dist?.taxCardNumber || '—'}</span>
                          <span className="text-[10px] text-slate-500">{dist ? formatDateArabic(dist.taxCardExpiryDate) : '—'}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#102A43] block">{dist?.commercialRegisterNumber || '—'}</span>
                          <span className="text-[10px] text-slate-500">{dist ? formatDateArabic(dist.commercialRegisterExpiryDate) : '—'}</span>
                        </td>
                        <td className="p-2.5 text-center num-cell font-bold">
                          <span className="font-black text-[#164E83] block">{dist?.permitOrLicenseNumber || '—'}</span>
                          <span className="text-[10px] text-emerald-700">{dist ? formatDateArabic(dist.licenseExpiryDate) : '—'}</span>
                        </td>
                        <td className="p-2.5 text-center font-black text-[#164E83]">{m.warehouseDeliveryPermitNo}</td>
                        <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(m.previousBalance)}</td>
                        <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(m.receivedCylinders)}</td>
                        <td className="p-2.5 text-center num-cell font-black text-emerald-700">{formatArabicNumber(m.distributedCylinders)}</td>
                        <td className="p-2.5 text-center num-cell font-bold">+{formatArabicNumber(m.returnedCylinders)} / -{formatArabicNumber(m.approvedDamagedCylinders)}</td>
                        <td className="p-2.5 text-center num-cell font-black text-[#102A43]">{formatArabicNumber(m.remainingBalance)} أسطوانة</td>
                        <td className="p-2.5 text-center">
                          <TableActionButtons
                            onView={() =>
                              setCrudModalState({
                                mode: 'view',
                                title: `حركة موزع البوتاجاز: ${m.distributorName}`,
                                record: { ...dist, ...m } as unknown as Record<string, unknown>,
                                fields: [...distributorFields, ...bdmFields],
                              })
                            }
                            onAdd={() => setShowAddDistMovModal(true)}
                            onEdit={() =>
                              setCrudModalState({
                                mode: 'edit',
                                title: `تعديل حركة الموزع: ${m.distributorName}`,
                                record: m as unknown as Record<string, unknown>,
                                fields: bdmFields,
                                onSave: (updated) => {
                                  const next = butaneDistributorMovements.map((x) =>
                                    x.id === m.id ? ({ ...x, ...updated } as ButaneDistributorMovementRecord) : x
                                  );
                                  onSaveButaneDistributorMovements(next);
                                  onNotify('تم تحديث حركة الموزع بنجاح.');
                                },
                              })
                            }
                            onDelete={() => {
                              const next = butaneDistributorMovements.filter((x) => x.id !== m.id);
                              onSaveButaneDistributorMovements(next);
                              onNotify('تم حذف حركة الموزع.');
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {showAddWhMovModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <form onSubmit={handleSaveWarehouseMovement} className="bg-white rounded-2xl border-2 border-[#102A43] max-w-xl w-full p-5 space-y-3 text-xs">
              <h4 className="text-sm font-black text-[#102A43] border-b pb-2">تسجيل حركة يومية لمستودع بوتاجاز</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-black block mb-1">المستودع</label>
                  <select value={whmWarehouseId} onChange={(e) => setWhmWarehouseId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                    {butaneWarehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouseName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-black block mb-1">رقم إذن التسليم للموزعين</label>
                  <input type="text" value={whmDistributorPermitNo} onChange={(e) => setWhmDistributorPermitNo(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold" />
                </div>
                <div>
                  <label className="font-black block mb-1">الرصيد الافتتاحي</label>
                  <input type="number" value={whmOpening} onChange={(e) => setWhmOpening(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">الوارد من بتروجاس</label>
                  <input type="number" value={whmReceived} onChange={(e) => setWhmReceived(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">المنصرف للموزعين</label>
                  <input type="number" value={whmDispensed} onChange={(e) => setWhmDispensed(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">الرصيد الفعلي بالجرد</label>
                  <input type="number" value={whmActual} onChange={(e) => setWhmActual(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddWhMovModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">حفظ الحركة</button>
              </div>
            </form>
          </div>
        )}

        {showAddDistMovModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <form onSubmit={handleSaveDistributorMovement} className="bg-white rounded-2xl border-2 border-[#102A43] max-w-xl w-full p-5 space-y-3 text-xs">
              <h4 className="text-sm font-black text-[#102A43] border-b pb-2">تسجيل حركة موزع مرتبطة بإذن تسليم المستودع</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-black block mb-1">الموزع</label>
                  <select value={dmDistributorId} onChange={(e) => setDmDistributorId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                    {butaneDistributors.map((d) => <option key={d.id} value={d.id}>{d.distributorName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-black block mb-1">إذن تسليم المستودع المرتبط</label>
                  <select value={dmPermitNo} onChange={(e) => setDmPermitNo(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg font-bold">
                    {butaneWarehouseMovements.map((m) => (
                      <option key={m.id} value={m.deliveryPermitToDistributorNo}>
                        {m.deliveryPermitToDistributorNo} ({m.warehouseName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-black block mb-1">الرصيد السابق</label>
                  <input type="number" value={dmPrevBalance} onChange={(e) => setDmPrevBalance(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">المستلم من المستودع</label>
                  <input type="number" value={dmReceived} onChange={(e) => setDmReceived(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">الموزع الفعلي للمواطنين</label>
                  <input type="number" value={dmDistributed} onChange={(e) => setDmDistributed(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
                <div>
                  <label className="font-black block mb-1">التالف المعتمد</label>
                  <input type="number" value={dmDamaged} onChange={(e) => setDmDamaged(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg font-black" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddDistMovModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 font-black cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">حفظ الحركة</button>
              </div>
            </form>
          </div>
        )}

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
      </div>
    );
  }

  // ==================== ١٧. شاشة المقارنة الإحصائية بين القرى والوحدات المحلية ====================
  const maxPrimaryVal = Math.max(1, ...villageComparisonRows.map((r) => r.primaryCount));
  const minPrimaryVal = Math.min(...villageComparisonRows.map((r) => r.primaryCount));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-[#102A43]">
              ١٧. المقارنة الإحصائية الشاملة بين القرى والوحدات المحلية
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              يتم ترتيب القرى حصرياً بناءً على المؤشر الإحصائي المختار بواسطة المستخدم، مع إظهار أعلى وأقل القيم والفروق والنسب المئوية
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exportCsvUtf8Bom(
                  'المقارنة_الإحصائية_بين_القرى_والوحدات_المحلية.csv',
                  ['القرية', 'الوحدة المحلية', 'المنشآت', 'المرخص', 'غير المرخص', 'الحملات', 'المحاضر', 'متوسط الأسعار', 'موزع البوتاجاز', 'نصيب الفرد بوتاجاز', 'موزع الوقود'],
                  villageComparisonRows.map((r) => [
                    r.village,
                    r.localUnit,
                    r.establishmentsCount,
                    r.licensedCount,
                    r.unlicensedCount,
                    r.campaignsCount,
                    r.reportsCount,
                    r.avgCommodityPriceEgp,
                    r.butaneDistributed,
                    r.butanePerCapita,
                    r.petroleumDistributed,
                  ])
                );
                onNotify('تم تصدير جدول المقارنة الإحصائية بين القرى إلى Excel.');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPrintComparison(true)}
              className="px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة المقارنة A4 / PDF</span>
            </button>
          </div>
        </div>

        {/* فلاتر المقارنة */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div>
            <label className="font-black text-[#102A43] block mb-1">محور المقارنة الرئيسي</label>
            <select
              value={compAxis}
              onChange={(e) => setCompAxis(e.target.value as typeof compAxis)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
            >
              <option value="establishments">١. مقارنة المنشآت والتراخيص</option>
              <option value="campaigns">٢. مقارنة الحملات والمخالفات والتصالحات</option>
              <option value="markets">٣. مقارنة الأسواق والأسعار</option>
              <option value="butane">٤. مقارنة البوتاجاز ونصيب الفرد</option>
              <option value="petroleum">٥. مقارنة المواد البترولية</option>
            </select>
          </div>
          <div>
            <label className="font-black text-[#102A43] block mb-1">الإدارة التموينية</label>
            <select
              value={compAdminFilter}
              onChange={(e) => setCompAdminFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
            >
              <option value="ALL">إدارة تموين مركز المحلة الكبرى</option>
            </select>
          </div>
          <div>
            <label className="font-black text-[#102A43] block mb-1">القرية / الوحدة المحلية</label>
            <select
              value={compVillageFilter}
              onChange={(e) => setCompVillageFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
            >
              <option value="ALL">مقارنة جميع القرى</option>
              {allVillages.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-black text-[#102A43] block mb-1">السنة المرجعية (للبوتاجاز والوقود)</label>
            <select
              value={compYearFilter}
              onChange={(e) => setCompYearFilter(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
            >
              <option value={2023}>عام ٢٠٢٣</option>
              <option value={2024}>عام ٢٠٢٤</option>
              <option value={2025}>عام ٢٠٢٥</option>
            </select>
          </div>
          <div>
            <label className="font-black text-[#102A43] block mb-1">معيار ترتيب القرى المعتمد</label>
            <select
              value={compSortMetric}
              onChange={(e) => setCompSortMetric(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
            >
              <option value="primaryCount">المؤشر الأساسي للمحور المختار</option>
              <option value="butanePerCapita">نصيب الفرد من البوتاجاز</option>
              <option value="reportsCount">عدد المحاضر المحررة</option>
              <option value="avgCommodityPriceEgp">متوسط أسعار السلع المرصودة</option>
            </select>
          </div>
        </div>

        {/* رسم بياني بالأعمدة للمقارنة بين القرى مع أعلى وأقل القيم */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-black text-[#102A43]">
            <span>الرسم البياني المقارن للقرى حسب المؤشر المختار</span>
            <span>
              أعلى قيمة: {formatArabicNumber(maxPrimaryVal)} · أقل قيمة: {formatArabicNumber(minPrimaryVal)} · الفرق: {formatArabicNumber(round2(maxPrimaryVal - minPrimaryVal))}
            </span>
          </div>
          <div className="space-y-2">
            {villageComparisonRows.map((r) => {
              const pct = Math.max(8, Math.round((r.primaryCount / maxPrimaryVal) * 100));
              return (
                <div key={r.village} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <span className="text-[#102A43]">{r.village} ({r.localUnit})</span>
                    <span className="num-cell text-[#164E83]">
                      {formatArabicNumber(r.primaryCount)} ({formatArabicNumber(pct)}٪ من الأعلى)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#102A43] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* جدول المقارنة الشامل */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2.5 border border-slate-700">القرية / الوحدة المحلية</th>
                <th className="p-2.5 border border-slate-700 text-center">إجمالي المنشآت (مرخص / غير مرخص)</th>
                <th className="p-2.5 border border-slate-700 text-center">الحملات والمحاضر</th>
                <th className="p-2.5 border border-slate-700 text-center">التصالحات المحصلة / المتبقية</th>
                <th className="p-2.5 border border-slate-700 text-center">متوسط الأسعار (أدنى - أعلى)</th>
                <th className="p-2.5 border border-slate-700 text-center">بوتاجاز {toArabicNumerals(compYearFilter)} (موزع / نصيب الفرد / تغير سنوي)</th>
                <th className="p-2.5 border border-slate-700 text-center">مواد بترولية (منصرف / نصيب المستفيد)</th>
                <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {villageComparisonRows.map((r) => {
                const cmpRowFields: EditableFieldSpec[] = [
                  { key: 'village', label: 'القرية' },
                  { key: 'localUnit', label: 'الوحدة المحلية' },
                  { key: 'establishmentsCount', label: 'إجمالي المنشآت', type: 'number' },
                  { key: 'licensedCount', label: 'المنشآت المرخصة', type: 'number' },
                  { key: 'unlicensedCount', label: 'المنشآت غير المرخصة', type: 'number' },
                  { key: 'campaignsCount', label: 'الحملات التموينية', type: 'number' },
                  { key: 'reportsCount', label: 'المحاضر المحررة', type: 'number' },
                  { key: 'collectedAmountEgp', label: 'التصالحات المحصلة (ج.م)', type: 'number' },
                  { key: 'butaneDistributed', label: 'موزع البوتاجاز (أسطوانة)', type: 'number' },
                  { key: 'butanePerCapita', label: 'نصيب الفرد من البوتاجاز', type: 'number' },
                  { key: 'petroleumDistributed', label: 'منصرف المواد البترولية (لتر)', type: 'number' },
                ];
                return (
                  <tr key={r.village} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2.5 font-black text-[#102A43]">{r.village} — {r.localUnit}</td>
                    <td className="p-2.5 text-center num-cell font-bold">
                      {toArabicNumerals(r.establishmentsCount)} ({toArabicNumerals(r.licensedCount)} مرخص / {toArabicNumerals(r.unlicensedCount)} غير مرخص)
                    </td>
                    <td className="p-2.5 text-center num-cell font-bold">
                      {toArabicNumerals(r.campaignsCount)} حملة · {toArabicNumerals(r.reportsCount)} محضر
                    </td>
                    <td className="p-2.5 text-center num-cell font-bold">
                      <span className="text-emerald-700">{formatArabicCurrency(r.collectedAmountEgp)}</span> / <span className="text-red-700">{formatArabicCurrency(r.remainingAmountEgp)}</span>
                    </td>
                    <td className="p-2.5 text-center num-cell font-bold">
                      {formatArabicNumber(r.avgCommodityPriceEgp)} ج.م ({formatArabicNumber(r.minCommodityPriceEgp)} - {formatArabicNumber(r.maxCommodityPriceEgp)})
                    </td>
                    <td className="p-2.5 text-center num-cell font-black text-[#164E83]">
                      {formatArabicNumber(r.butaneDistributed)} أسطوانة · {formatArabicNumber(r.butanePerCapita)}/مستفيد ({r.butaneAnnualChangePct >= 0 ? '+' : ''}{formatArabicNumber(r.butaneAnnualChangePct)}٪)
                    </td>
                    <td className="p-2.5 text-center num-cell font-black">
                      {formatArabicNumber(r.petroleumDistributed)} لتر · {formatArabicNumber(r.petroleumPerBeneficiary)} لتر/مستفيد
                    </td>
                    <td className="p-2.5 text-center">
                      <TableActionButtons
                        onView={() =>
                          setCrudModalState({
                            mode: 'view',
                            title: `الملف الإحصائي المقارن لقرية: ${r.village}`,
                            record: r as unknown as Record<string, unknown>,
                            fields: cmpRowFields,
                          })
                        }
                        onAdd={() => setShowPrintComparison(true)}
                        onEdit={() => {
                          const targetB = butaneAllocations.find((b) => b.village === r.village);
                          if (targetB) {
                            setCrudModalState({
                              mode: 'edit',
                              title: `تعديل حصص ومؤشرات قرية: ${r.village}`,
                              record: targetB as unknown as Record<string, unknown>,
                              fields: butaneEditableFields,
                              onSave: (updated) => {
                                const next = butaneAllocations.map((x) =>
                                  x.id === targetB.id ? ({ ...x, ...updated } as ButaneVillageAllocationRecord) : x
                                );
                                onSaveButaneAllocations(next);
                                onNotify(`تم تحديث مؤشرات قرية (${r.village}) بنجاح.`);
                              },
                            });
                          }
                        }}
                        onDelete={() => {
                          setCompVillageFilter(r.village);
                          onNotify(`تمت تصفية المقارنة لعرض قرية (${r.village}).`);
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

      {showPrintComparison && (
        <OfficialPrintModal
          title="تقرير المقارنة الإحصائية بين القرى والوحدات المحلية — قسم التجارة الداخلية"
          subtitle={`سنة المقارنة: ${toArabicNumerals(compYearFilter)} — معيار الترتيب المعتمد: ${compSortMetric}`}
          docNumber={`CMP-VIL-${todayRef}`}
          printedBy={currentUserName}
          todayRef={todayRef}
          onClose={() => setShowPrintComparison(false)}
        >
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-2 border">القرية</th>
                <th className="p-2 border text-center">المنشآت (مرخص/غير مرخص)</th>
                <th className="p-2 border text-center">الحملات والمحاضر</th>
                <th className="p-2 border text-center">التصالحات المحصلة</th>
                <th className="p-2 border text-center">موزع البوتاجاز ونصيب الفرد</th>
                <th className="p-2 border text-center">منصرف المواد البترولية</th>
                <th className="p-2 border text-center print:hidden">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {villageComparisonRows.map((r) => (
                <tr key={r.village}>
                  <td className="p-2 border font-black">{r.village}</td>
                  <td className="p-2 border text-center">{toArabicNumerals(r.establishmentsCount)} ({toArabicNumerals(r.licensedCount)} / {toArabicNumerals(r.unlicensedCount)})</td>
                  <td className="p-2 border text-center">{toArabicNumerals(r.campaignsCount)} حملة / {toArabicNumerals(r.reportsCount)} محضر</td>
                  <td className="p-2 border text-center">{formatArabicCurrency(r.collectedAmountEgp)}</td>
                  <td className="p-2 border text-center">{formatArabicNumber(r.butaneDistributed)} ({formatArabicNumber(r.butanePerCapita)}/مستفيد)</td>
                  <td className="p-2 border text-center">{formatArabicNumber(r.petroleumDistributed)} لتر</td>
                  <td className="p-2 border text-center print:hidden">
                    <button
                      type="button"
                      onClick={() => setShowPrintComparison(false)}
                      className="px-2 py-0.5 rounded bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
                    >
                      تفاصيل القرية
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </OfficialPrintModal>
      )}

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
    </div>
  );
}
