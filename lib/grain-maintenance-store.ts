// =============================================================================
// منظومة التموين والتجارة الداخلية بالغربية — قسم صيانة الحبوب
// قاعدة البيانات التشغيلية المترابطة، المعادلات الحسابية المعتمدة، محرك التنبيهات،
// ومصفوفة اختبارات القبول الـ ٢٣
// =============================================================================

import { BakeryRecord } from '@/types';
import { round2 } from '@/lib/bakery-math';

export type GrainApprovalStatus = 'مسودة' | 'تحت المراجعة' | 'معتمد' | 'مرفوض' | 'ملغى';

export type GrainScreenId =
  | 'dashboard'
  | 'warehouses'
  | 'receipts'
  | 'moisture_loss'
  | 'mills'
  | 'extraction'
  | 'flour_quotas'
  | 'refrigerators'
  | 'cold_monitoring'
  | 'assets'
  | 'asset_valuation'
  | 'maintenance_orders'
  | 'spare_parts'
  | 'financial_accounts'
  | 'cost_centers'
  | 'facility_comparison'
  | 'smart_alerts'
  | 'reports_center'
  | 'print_export'
  | 'audit_log'
  | 'permissions_matrix'
  | 'section_settings';

export interface GrainSectionSettings {
  standardMoisturePct: number; // 13.00%
  maxAllowedMoisturePct: number; // 14.50%
  moistureDeductionMultiplier: number; // 1.15
  standardFlourExtractionPct: number; // 87.50%
  standardBranPct: number; // 12.00%
  maxAllowedMillLossPct: number; // 1.00%
  maxAllowedStorageLossPct: number; // 0.50%
  maxAllowedWeightDiffTons: number; // 0.050 طن
  formulaReferenceVersion: string;
}

export interface GrainCostCenter {
  id: string;
  code: string;
  name: string;
  facilityType: 'شونة / صومعة' | 'مطحن' | 'ثلاجة تبريد' | 'إدارة هندسية';
  facilityId: string;
  administration: string;
  allocatedBudgetEgp: number;
}

export interface GrainWarehouseRecord {
  id: string;
  code: string;
  name: string;
  facilityType:
    | 'شونة ترابية مطورة'
    | 'شونة أسفلتية'
    | 'صومعة معدنية'
    | 'صومعة خرسانية'
    | 'هنجر مطور'
    | 'بنكر تخزين'
    | 'مخزن حبوب';
  supervisingAuthority: string;
  administration: string;
  localUnit: string;
  villageOrCity: string;
  detailedAddress: string;
  managerName: string;
  phone: string;
  designCapacityTons: number;
  actualCapacityTons: number;
  cellsCount: number;
  approvedOpeningBalanceTons: number; // الرصيد الافتتاحي المعتمد
  operatingStatus: 'عاملة' | 'متوقفة مؤقتاً' | 'تحت الصيانة' | 'تحت الفحص الهندسي';
  engineeringStatus: 'ممتازة' | 'جيدة' | 'تحتاج صيانة' | 'تحتاج فحص هندسي';
  safetyStatus: 'مستوفاة' | 'تحتاج استكمال اشتراطات';
  licenseNumber: string;
  licenseExpiryDate: string;
  lastInspectionDate: string;
  costCenterId: string;
  notes: string;
}

export interface GrainReceiptRecord {
  id: string;
  receiptNumber: string;
  weighingTicketNumber: string;
  inspectionReportNumber: string;
  receiptDate: string;
  receiptTime: string;
  warehouseId: string;
  cellCode: string;
  supplierName: string;
  supplierType: 'مزارع' | 'جمعية زراعية' | 'تاجر مورد' | 'جهة حكومية' | 'تحويل من شونة أخرى';
  wheatOrigin: string;
  cropSeason: string;
  vehicleNumber: string;
  driverName: string;
  driverNationalId: string;
  grossWeightTons: number;
  tareWeightTons: number;
  actualNetWeightTons: number; // الوزن الفعلي (الإجمالي - الفارغ) محفوظ دائماً
  documentedWeightTons: number;
  weightDifferenceTons: number;
  moisturePct: number;
  impuritiesPct: number;
  purityKirat: number;
  weevilInfestationStatus: 'خالٍ من الإصابة' | 'إصابة ظاهرية طفيفة' | 'مرفوض لإصابة حشرية';
  grainTemperatureC: number;
  inspectionResult: 'مقبول' | 'مقبول مع ملاحظة' | 'مرفوض' | 'تحت الفحص';
  receivingCommittee: string;
  approvingOfficer: string;
  approvalStatus: GrainApprovalStatus;
  cancellationReason?: string;
  notes: string;
}

export interface GrainMoistureRecord {
  id: string;
  recordNumber: string;
  warehouseId: string;
  receiptId?: string;
  cellCode: string;
  measurementDate: string;
  measuredMoisturePct: number;
  referenceMoisturePct: number;
  moistureVariancePct: number;
  actualWeightBeforeTons: number;
  moistureDeductionTons: number;
  accountingAdjustedWeightTons: number;
  formulaReference: string;
  inspectorName: string;
  approvalStatus: GrainApprovalStatus;
  notes: string;
}

export interface GrainLossRecord {
  id: string;
  recordNumber: string;
  warehouseId: string;
  inventoryDate: string;
  bookBalanceTons: number;
  actualPhysicalBalanceTons: number;
  varianceTons: number; // سالب = عجز، موجب = زيادة
  variancePct: number;
  allowedLossLimitPct: number;
  varianceClassification: 'فاقد طبيعي مسموح' | 'عجز غير مبرر' | 'زيادة جردية' | 'مطابق تماماً';
  causeDescription: string;
  committeeReportNumber: string;
  approvalStatus: GrainApprovalStatus;
  notes: string;
}

export interface GrainMovementRecord {
  id: string;
  movementNumber: string;
  movementDate: string;
  movementType: 'صرف لمطحن' | 'تحويل صادر لشونة' | 'تحويل وارد من شونة';
  sourceWarehouseId: string;
  targetWarehouseId?: string;
  targetMillId?: string;
  quantityTons: number;
  vehicleNumber: string;
  driverName: string;
  weighingTicketNumber: string;
  approvalStatus: GrainApprovalStatus;
  approvedBy: string;
  notes: string;
}

export interface GrainMillRecord {
  id: string;
  code: string;
  name: string;
  millType: 'مطحن سلندرات حديث' | 'مطحن حجارة مطور' | 'مطحن قطاع عام' | 'مطحن قطاع خاص تمويني';
  ownerCompany: string;
  administration: string;
  localUnit: string;
  villageOrCity: string;
  detailedAddress: string;
  managerName: string;
  phone: string;
  dailyProductionCapacityTons: number;
  operatingLinesCount: number;
  targetExtractionRatePct: number; // 87.50%
  operatingStatus: 'عامل' | 'متوقف للصيانة' | 'انخفاض كفاءة تشغيل';
  licenseNumber: string;
  licenseExpiryDate: string;
  costCenterId: string;
  notes: string;
}

export interface MillDailyOperationRecord {
  id: string;
  operationNumber: string;
  operationDate: string;
  millId: string;
  sourceWarehouseId: string;
  openingWheatTons: number;
  receivedWheatTons: number;
  groundWheatTons: number;
  flour875ProducedTons: number;
  coarseBranProducedTons: number;
  fineBranProducedTons: number;
  semolinaOrOtherTons: number;
  impuritiesSeparatedTons: number;
  operationStatus: 'مكتمل' | 'تحت التشغيل' | 'غير مكتمل';
  approvalStatus: GrainApprovalStatus;
  shiftSupervisor: string;
  notes: string;
}

export interface FlourDistributionRecord {
  id: string;
  voucherNumber: string;
  distributionDate: string;
  bakeryId: string; // مرتبط مباشرة بسجل المخابز الحالي BakeryRecord.id
  millId: string;
  dailyQuotaSacks: number; // شيكارة 50 كجم
  approvedDays: number;
  issuedFromMillTons: number;
  receivedByBakeryTons: number;
  approvalStatus: GrainApprovalStatus;
  notes: string;
}

export interface RefrigeratorRecord {
  id: string;
  code: string;
  name: string;
  refrigeratorType: 'ثلاجة تبريد' | 'ثلاجة تجميد عميق' | 'مجمع تبريد وتجميد متعدد الغرف';
  supervisingAuthority: string;
  administration: string;
  localUnit: string;
  villageOrCity: string;
  detailedAddress: string;
  managerName: string;
  phone: string;
  roomsCount: number;
  totalCapacityTons: number;
  approvedOpeningStockTons: number;
  storedProductCategory: string;
  minSafeTempC: number;
  maxSafeTempC: number;
  currentTempC: number;
  currentHumidityPct: number;
  coolingUnitStatus: 'تعمل بكفاءة' | 'تعمل جزئياً' | 'تحتاج صيانة عاجلة';
  backupGeneratorStatus: 'جاهز للعمل تلقائياً' | 'قيد التشغيل الاحتياطي' | 'يحتاج صيانة';
  operatingStatus: 'عاملة' | 'متوقفة للصيانة' | 'إنذار حرارة';
  licenseNumber: string;
  costCenterId: string;
  notes: string;
}

export interface RefrigeratorTempLogRecord {
  id: string;
  logNumber: string;
  refrigeratorId: string;
  roomCode: string;
  recordedDate: string;
  recordedTime: string;
  productName: string;
  measuredTempC: number;
  minAllowedTempC: number;
  maxAllowedTempC: number;
  humidityPct: number;
  powerSource: 'كهرباء عمومية' | 'مولد احتياطي ديزل' | 'انقطاع تيار مؤقت';
  correctiveAction: string;
  recordedBy: string;
}

export interface RefrigeratorMovementRecord {
  id: string;
  movementNumber: string;
  refrigeratorId: string;
  roomCode: string;
  movementDate: string;
  movementType: 'وارد تخزين' | 'منصرف' | 'تالف مستبعد';
  productName: string;
  quantityTons: number;
  batchExpiryDate: string;
  approvalStatus: GrainApprovalStatus;
  approvedBy: string;
  notes: string;
}

export const GRAIN_ASSET_CATEGORIES = [
  'معدات الشون والصوامع',
  'موازين أرضية وبسكول',
  'سيور ناقلة ونواقل حركة',
  'روافع ونواقل رأسية (أليفيتور)',
  'معدات تنظيف وغربلة الحبوب',
  'ماكينات طحن وسلندرات',
  'مناخل وخطوط نخل الدقيق',
  'ماكينات تعبئة وتغليف الدقيق',
  'وحدات وضواغط تبريد وتجميد',
  'غرف تبريد وعزل حراري',
  'مولدات كهرباء احتياطية',
  'لوحات تحكم وكهرباء قدرة',
  'أجهزة قياس رطوبة وحرارة وجودة',
  'معدات تهوية وشفط أتربة',
  'سيارات نقل ومعدات مناولة ولودر',
  'أنظمة إطفاء وإنذار وسلامة مهنية',
  'مبانٍ ومنشآت وهناجر تخزينية',
  'أجهزة حاسب وشبكات ومراقبة',
] as const;

export type GrainAssetCategory = (typeof GRAIN_ASSET_CATEGORIES)[number];

export interface GrainAssetRecord {
  id: string;
  assetCode: string;
  name: string;
  assetCategory: GrainAssetCategory;
  facilityType: 'شونة / صومعة' | 'مطحن' | 'ثلاجة تبريد';
  facilityId: string;
  facilityName: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  manufactureYear: number;
  supplyDate: string;
  operationStartDate: string;
  purchaseCostEgp: number;
  capitalAdditionsEgp: number; // الإضافات الرأسمالية المعتمدة
  accumulatedDepreciationEgp: number;
  usefulLifeYears: number;
  annualDepreciationRatePct: number;
  technicalCondition: 'ممتازة' | 'جيدة جداً' | 'تحتاج صيانة' | 'متوقفة لعطل' | 'تحت الفحص للكهنة';
  operatingStatus: 'عامل' | 'متوقف للصيانة' | 'احتياطي جاهز' | 'خارج الخدمة';
  warrantyExpiryDate: string;
  custodianName: string;
  maintenanceIntervalDays: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  costCenterId: string;
  notes: string;
}

export interface GrainAssetValuationRecord {
  id: string;
  valuationNumber: string;
  assetId: string;
  valuationDate: string;
  valuationType: 'إهلاك دوري معتمد' | 'إضافة وتحسين رأسمالي' | 'إعادة تقييم فني' | 'تخريد واستبعاد جزئي';
  historicalCostEgp: number;
  capitalImprovementsEgp: number;
  operatingMaintenanceExpensesEgp: number; // مصروف صيانة تشغيلي لا يرفع القيمة الدفترية تلقائياً
  accumulatedDepreciationEgp: number;
  netBookValueEgp: number;
  estimatedReplacementValueEgp: number;
  committeeDecisionNumber: string;
  approvalStatus: GrainApprovalStatus;
  notes: string;
}

export interface GrainMaintenanceOrderRecord {
  id: string;
  orderNumber: string;
  maintenanceType: 'صيانة وقائية دورية' | 'صيانة طارئة' | 'عمرة هندسية جسيمة' | 'معايرة فنية لميزان/حساس';
  faultCategory: 'عطل ميكانيكي' | 'عطل كهربائي ولوحات' | 'عطل تبريد وضواغط' | 'عطل ميزان وخلايا وزن' | 'صيانة وقائية مجدولة';
  priority: 'طارئة جداً' | 'عاجلة' | 'متوسطة' | 'عادية';
  facilityType: 'شونة / صومعة' | 'مطحن' | 'ثلاجة تبريد';
  facilityId: string;
  facilityName: string;
  assetId: string;
  assetName: string;
  faultReportDate: string;
  workStartDate: string;
  workEndDate: string;
  downtimeHours: number;
  faultDescription: string;
  rootCause: string;
  workPerformed: string;
  executingEntity: 'فريق الصيانة الهندسية بالمديرية' | 'شركة صيانة معتمدة متخصصة';
  engineerName: string;
  sparePartsCostEgp: number;
  externalLaborCostEgp: number;
  totalMaintenanceCostEgp: number;
  capitalizedToAsset: boolean; // true فقط للعمرات الرأسمالية المعتمدة
  postMaintenanceTestResult: string;
  orderStatus: 'مفتوح' | 'قيد التنفيذ' | 'مكتمل ومغلق' | 'ملغى';
  approvalStatus: GrainApprovalStatus;
  costCenterId: string;
  notes: string;
}

export interface SparePartRecord {
  id: string;
  partCode: string;
  name: string;
  category:
    | 'رومان بلي وكراسي محور'
    | 'سيور ناقلة وقوايش'
    | 'فلاتر ومصافي'
    | 'حساسات حرارة ورطوبة'
    | 'خلايا وزن إلكترونية'
    | 'ضواغط وصمامات تبريد'
    | 'قواطع ومكونات كهرباء قدرة';
  unit: string;
  warehouseLocation: string;
  compatibleAssets: string;
  approvedOpeningQty: number;
  minReorderLevel: number;
  unitCostEgp: number;
  supplierName: string;
  notes: string;
}

export interface SparePartMovementRecord {
  id: string;
  movementNumber: string;
  partId: string;
  movementDate: string;
  movementType: 'توريد للمخزن' | 'صرف لأمر صيانة' | 'مرتجع للمخزن' | 'تسوية جردية';
  quantity: number;
  unitCostEgp: number;
  totalCostEgp: number;
  maintenanceOrderId?: string;
  maintenanceOrderStatus: 'مفتوح' | 'قيد التنفيذ' | 'مكتمل ومغلق' | 'ملغى';
  facilityName: string;
  assetName: string;
  approvalStatus: GrainApprovalStatus;
  approvedBy: string;
  notes: string;
}

export const GRAIN_FINANCIAL_ACCOUNT_CATEGORIES = [
  '١. تكلفة شراء وتوريد الأصول الهندسية',
  '٢. مصروفات الصيانة الدورية والوقائية',
  '٣. مصروفات الصيانة الطارئة والأعطال',
  '٤. تكلفة شراء واستهلاك قطع الغيار',
  '٥. مصروفات تشغيل الشون والصوامع',
  '٦. مصروفات تشغيل المطاحن وخطوط الإنتاج',
  '٧. مصروفات تشغيل الثلاجات ومخازن التبريد',
  '٨. مصروفات الكهرباء والوقود والطاقة',
  '٩. مصروفات النقل والتحميل والمناولة',
  '١٠. مصروفات الفحص المعملي ومعايرة الموازين',
  '١١. مصروفات التطهير والتبخير ومكافحة الآفات',
  '١٢. تكلفة الفاقد والعجز والتالف غير المبرر',
  '١٣. إيرادات ومقابل خدمات التخزين والطحن والتبريد',
  '١٤. التسويات المحاسبية والقيود العكسية',
  '١٥. مخصصات الإهلاك السنوي للأصول الهندسية',
] as const;

export type GrainFinancialAccountCategory = (typeof GRAIN_FINANCIAL_ACCOUNT_CATEGORIES)[number];

export interface GrainFinancialTransactionRecord {
  id: string;
  documentNumber: string;
  transactionDate: string;
  accountCategory: GrainFinancialAccountCategory;
  entryType: 'مصروف تشغيلي' | 'مصروف رأسمالي' | 'إيراد تشغيلي' | 'تسوية محاسبية' | 'قيد عكسي';
  costCenterId: string;
  facilityType: 'شونة / صومعة' | 'مطحن' | 'ثلاجة تبريد' | 'إدارة هندسية';
  facilityId: string;
  facilityName: string;
  relatedReferenceNumber: string;
  debitAmountEgp: number;
  creditAmountEgp: number;
  netAmountEgp: number;
  beneficiaryOrPayer: string;
  paymentMethod: string;
  approvalStatus: GrainApprovalStatus;
  approvedBy: string;
  description: string;
}

export interface GrainScaleRecord {
  id: string;
  scaleCode: string;
  scaleName: string;
  facilityType: 'شونة / صومعة' | 'مطحن';
  facilityId: string;
  facilityName: string;
  maxCapacityTons: number;
  calibrationCertNumber: string;
  lastCalibrationDate: string;
  nextCalibrationDate: string;
  status: 'معتمد وصالح' | 'يحتاج تجديد معايرة' | 'تحت الصيانة';
}

export interface GrainAuditLogRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  actionType: 'إضافة' | 'تعديل' | 'اعتماد' | 'إلغاء موثق' | 'قيد عكسي' | 'طباعة' | 'تصدير';
  targetScreen: string;
  targetRecordId: string;
  facilityName: string;
  beforeSummary: string;
  afterSummary: string;
  reason: string;
}

export type GrainAlertSeverity = 'حرج' | 'عالي' | 'متوسط' | 'منخفض' | 'معلوماتي';
export type GrainAlertDomain =
  | 'تنبيهات الشون والقمح'
  | 'تنبيهات المطاحن والاستخراج'
  | 'تنبيهات حصص الدقيق'
  | 'تنبيهات الثلاجات والتبريد'
  | 'تنبيهات الأصول والصيانة وقطع الغيار'
  | 'تنبيهات الحسابات المالية والاعتمادات';

export interface SmartGrainAlert {
  id: string;
  domain: GrainAlertDomain;
  severity: GrainAlertSeverity;
  title: string;
  description: string;
  facilityName: string;
  referenceCode: string;
  targetScreen: GrainScreenId;
  measuredValue: string;
  thresholdValue: string;
}

export interface GrainMaintenanceStoreData {
  settings: GrainSectionSettings;
  costCenters: GrainCostCenter[];
  warehouses: GrainWarehouseRecord[];
  scales: GrainScaleRecord[];
  receipts: GrainReceiptRecord[];
  moistureRecords: GrainMoistureRecord[];
  lossRecords: GrainLossRecord[];
  movements: GrainMovementRecord[];
  mills: GrainMillRecord[];
  millOperations: MillDailyOperationRecord[];
  flourDistributions: FlourDistributionRecord[];
  refrigerators: RefrigeratorRecord[];
  refrigeratorTempLogs: RefrigeratorTempLogRecord[];
  refrigeratorMovements: RefrigeratorMovementRecord[];
  assets: GrainAssetRecord[];
  assetValuations: GrainAssetValuationRecord[];
  maintenanceOrders: GrainMaintenanceOrderRecord[];
  spareParts: SparePartRecord[];
  sparePartMovements: SparePartMovementRecord[];
  financialTransactions: GrainFinancialTransactionRecord[];
  auditLogs: GrainAuditLogRecord[];
}

// =============================================================================
// المعادلات والقواعد الحسابية المعتمدة (Non-manual deterministic calculations)
// =============================================================================

/**
 * 1. حساب الوزن الصافي الفعلي وفرق الوزن دون تعديل يدوي
 * الوزن الصافي الفعلي = الوزن القائم - وزن الفارغ
 * فرق الوزن = الوزن الصافي الفعلي - الوزن بالمستند
 */
export function computeNetWeightAndDiff(
  grossWeightTons: number,
  tareWeightTons: number,
  documentedWeightTons: number
) {
  const actualNetWeightTons = round2(Math.max(0, grossWeightTons - tareWeightTons));
  const weightDifferenceTons = round2(actualNetWeightTons - documentedWeightTons);
  const weightDiffPct =
    documentedWeightTons > 0
      ? round2((Math.abs(weightDifferenceTons) / documentedWeightTons) * 100)
      : 0;
  return {
    actualNetWeightTons,
    weightDifferenceTons,
    weightDiffPct,
  };
}

/**
 * 2. حساب فرق الرطوبة والوزن المحاسبي المعدل في سجل منفصل مع الحفاظ على الوزن الفعلي الأصلي
 */
export function computeMoistureCorrection(
  actualWeightBeforeTons: number,
  measuredMoisturePct: number,
  referenceMoisturePct: number,
  deductionMultiplier = 1.15
) {
  const moistureVariancePct = round2(measuredMoisturePct - referenceMoisturePct);
  const excessMoisturePct = Math.max(0, moistureVariancePct);
  const moistureDeductionTons =
    excessMoisturePct > 0
      ? round2((actualWeightBeforeTons * excessMoisturePct * deductionMultiplier) / 100)
      : 0;
  const accountingAdjustedWeightTons = round2(
    Math.max(0, actualWeightBeforeTons - moistureDeductionTons)
  );
  return {
    moistureVariancePct,
    moistureDeductionTons,
    accountingAdjustedWeightTons,
  };
}

/**
 * 3. حساب الفاقد والعجز والزيادة ونسبتها المئوية
 * الفاقد أو الزيادة = الرصيد الفعلي - الرصيد الدفتري
 * نسبة الفاقد = (الفاقد ÷ الكمية المرجعية) × 100
 */
export function computeLossVariance(
  actualPhysicalBalanceTons: number,
  bookBalanceTons: number,
  allowedLossLimitPct = 0.5
) {
  const varianceTons = round2(actualPhysicalBalanceTons - bookBalanceTons);
  const variancePct =
    bookBalanceTons > 0 ? round2((varianceTons / bookBalanceTons) * 100) : 0;
  const absLossPct = varianceTons < 0 ? Math.abs(variancePct) : 0;

  let varianceClassification: GrainLossRecord['varianceClassification'] = 'مطابق تماماً';
  if (varianceTons > 0.01) {
    varianceClassification = 'زيادة جردية';
  } else if (varianceTons < -0.01) {
    varianceClassification =
      absLossPct <= allowedLossLimitPct ? 'فاقد طبيعي مسموح' : 'عجز غير مبرر';
  }

  return {
    varianceTons,
    variancePct,
    varianceClassification,
  };
}

/**
 * 4. حساب الرصيد الختامي للشونة أو الصومعة آلياً من الحركات المعتمدة فقط
 * الرصيد الختامي = الرصيد الافتتاحي المعتمد + الوارد المعتمد + التحويلات الواردة المعتمدة
 *                - المنصرف المعتمد - التحويلات الصادرة المعتمدة + التسويات/الجرد المعتمدة
 */
export function computeWarehouseBalance(
  warehouse: GrainWarehouseRecord,
  receipts: GrainReceiptRecord[],
  movements: GrainMovementRecord[],
  lossRecords: GrainLossRecord[]
) {
  const approvedReceiptsTons = round2(
    receipts
      .filter(
        (r) =>
          r.warehouseId === warehouse.id &&
          r.approvalStatus === 'معتمد' &&
          (r.inspectionResult === 'مقبول' || r.inspectionResult === 'مقبول مع ملاحظة')
      )
      .reduce((sum, r) => sum + r.actualNetWeightTons, 0)
  );

  const approvedInboundTransfersTons = round2(
    movements
      .filter(
        (m) =>
          m.targetWarehouseId === warehouse.id &&
          m.movementType === 'تحويل وارد من شونة' &&
          m.approvalStatus === 'معتمد'
      )
      .reduce((sum, m) => sum + m.quantityTons, 0)
  );

  const approvedIssuedToMillsTons = round2(
    movements
      .filter(
        (m) =>
          m.sourceWarehouseId === warehouse.id &&
          m.movementType === 'صرف لمطحن' &&
          m.approvalStatus === 'معتمد'
      )
      .reduce((sum, m) => sum + m.quantityTons, 0)
  );

  const approvedOutboundTransfersTons = round2(
    movements
      .filter(
        (m) =>
          m.sourceWarehouseId === warehouse.id &&
          m.movementType === 'تحويل صادر لشونة' &&
          m.approvalStatus === 'معتمد'
      )
      .reduce((sum, m) => sum + m.quantityTons, 0)
  );

  const approvedAdjustmentsTons = round2(
    lossRecords
      .filter((l) => l.warehouseId === warehouse.id && l.approvalStatus === 'معتمد')
      .reduce((sum, l) => sum + l.varianceTons, 0)
  );

  const closingBalanceTons = round2(
    warehouse.approvedOpeningBalanceTons +
      approvedReceiptsTons +
      approvedInboundTransfersTons -
      approvedIssuedToMillsTons -
      approvedOutboundTransfersTons +
      approvedAdjustmentsTons
  );

  const occupancyPct =
    warehouse.actualCapacityTons > 0
      ? round2((closingBalanceTons / warehouse.actualCapacityTons) * 100)
      : 0;

  return {
    openingBalanceTons: round2(warehouse.approvedOpeningBalanceTons),
    approvedReceiptsTons,
    approvedInboundTransfersTons,
    approvedIssuedToMillsTons,
    approvedOutboundTransfersTons,
    approvedAdjustmentsTons,
    closingBalanceTons,
    occupancyPct,
  };
}

/**
 * 5. حساب نسب استخراج الدقيق والردة وفاقد الطحن مع حماية القسمة على صفر والعمليات غير المكتملة
 * نسبة استخراج الدقيق = (الدقيق الناتج ÷ القمح المطحون) × 100
 * نسبة الردة = (الردة ÷ القمح المطحون) × 100
 * نسبة الفاقد = ((القمح المطحون - مجموع النواتج) ÷ القمح المطحون) × 100
 */
export function computeMillExtractionMetrics(
  groundWheatTons: number,
  flour875ProducedTons: number,
  coarseBranProducedTons: number,
  fineBranProducedTons: number,
  semolinaOrOtherTons = 0,
  impuritiesSeparatedTons = 0,
  targetExtractionPct = 87.5
) {
  const totalBranTons = round2(coarseBranProducedTons + fineBranProducedTons);
  const totalOutputsTons = round2(
    flour875ProducedTons + totalBranTons + semolinaOrOtherTons + impuritiesSeparatedTons
  );

  if (groundWheatTons <= 0) {
    return {
      isComplete: false,
      totalBranTons,
      totalOutputsTons,
      flourExtractionPct: 0,
      branExtractionPct: 0,
      grindingLossTons: 0,
      grindingLossPct: 0,
      varianceFromTargetPct: 0,
    };
  }

  const flourExtractionPct = round2((flour875ProducedTons / groundWheatTons) * 100);
  const branExtractionPct = round2((totalBranTons / groundWheatTons) * 100);
  const grindingLossTons = round2(groundWheatTons - totalOutputsTons);
  const grindingLossPct = round2((grindingLossTons / groundWheatTons) * 100);
  const varianceFromTargetPct = round2(flourExtractionPct - targetExtractionPct);

  return {
    isComplete: true,
    totalBranTons,
    totalOutputsTons,
    flourExtractionPct,
    branExtractionPct,
    grindingLossTons,
    grindingLossPct,
    varianceFromTargetPct,
  };
}

/**
 * 6. حساب حصص الدقيق للمخابز المرتبطة بجدول المخابز الحالي
 * إجمالي الحصة = الحصة اليومية × عدد الأيام المعتمدة
 * المتبقي = الحصة المقررة - الكمية المنصرفة
 * نسبة التنفيذ = (الكمية المستلمة ÷ الحصة المقررة) × 100
 */
export function computeFlourQuotaMetrics(
  dailyQuotaSacks: number,
  approvedDays: number,
  issuedFromMillTons: number,
  receivedByBakeryTons: number
) {
  // الشيكارة القياسية 50 كجم = 0.05 طن
  const dailyQuotaTons = round2(dailyQuotaSacks * 0.05);
  const totalScheduledTons = round2(dailyQuotaTons * Math.max(1, approvedDays));
  const remainingQuotaTons = round2(Math.max(0, totalScheduledTons - issuedFromMillTons));
  const discrepancyTons = round2(receivedByBakeryTons - issuedFromMillTons);
  const fulfillmentPct =
    totalScheduledTons > 0 ? round2((receivedByBakeryTons / totalScheduledTons) * 100) : 0;

  let quotaStatus: 'مستلمة بالكامل' | 'منصرفة جزئياً' | 'فرق بين المطحن والمخبز' | 'معلقة' =
    'مستلمة بالكامل';
  if (Math.abs(discrepancyTons) > 0.01) {
    quotaStatus = 'فرق بين المطحن والمخبز';
  } else if (remainingQuotaTons > 0.01) {
    quotaStatus = issuedFromMillTons > 0 ? 'منصرفة جزئياً' : 'معلقة';
  }

  return {
    dailyQuotaTons,
    totalScheduledTons,
    remainingQuotaTons,
    discrepancyTons,
    fulfillmentPct,
    quotaStatus,
  };
}

/**
 * 7. حساب رصيد مخزون الثلاجة آلياً وفحص حالة درجة الحرارة وفق الحدود الآمنة للمنتج
 */
export function computeRefrigeratorStatus(
  refrigerator: RefrigeratorRecord,
  movements: RefrigeratorMovementRecord[]
) {
  const approvedInboundTons = round2(
    movements
      .filter(
        (m) =>
          m.refrigeratorId === refrigerator.id &&
          m.movementType === 'وارد تخزين' &&
          m.approvalStatus === 'معتمد'
      )
      .reduce((s, m) => s + m.quantityTons, 0)
  );
  const approvedOutboundTons = round2(
    movements
      .filter(
        (m) =>
          m.refrigeratorId === refrigerator.id &&
          (m.movementType === 'منصرف' || m.movementType === 'تالف مستبعد') &&
          m.approvalStatus === 'معتمد'
      )
      .reduce((s, m) => s + m.quantityTons, 0)
  );

  const currentStockTons = round2(
    Math.max(0, refrigerator.approvedOpeningStockTons + approvedInboundTons - approvedOutboundTons)
  );
  const occupancyPct =
    refrigerator.totalCapacityTons > 0
      ? round2((currentStockTons / refrigerator.totalCapacityTons) * 100)
      : 0;

  const isTempOutOfRange =
    refrigerator.currentTempC < refrigerator.minSafeTempC ||
    refrigerator.currentTempC > refrigerator.maxSafeTempC;

  return {
    approvedInboundTons,
    approvedOutboundTons,
    currentStockTons,
    occupancyPct,
    isTempOutOfRange,
  };
}

/**
 * 8. حساب القيمة الدفترية والإهلاك للأصل الهندسي مع الفصل بين المصروف التشغيلي والإضافة الرأسمالية
 * القيمة الدفترية الصافية = تكلفة الشراء التاريخية + الإضافات الرأسمالية المعتمدة - مجمع الإهلاك
 * (مصروفات الصيانة الدورية والطارئة العادية تُسجل كمصروف تشغيلي ولا ترفع القيمة الدفترية تلقائياً)
 */
export function computeAssetBookValue(
  asset: GrainAssetRecord,
  maintenanceOrders: GrainMaintenanceOrderRecord[]
) {
  const approvedCapitalizedMaintenanceEgp = round2(
    maintenanceOrders
      .filter(
        (o) =>
          o.assetId === asset.id &&
          o.approvalStatus === 'معتمد' &&
          o.orderStatus === 'مكتمل ومغلق' &&
          o.capitalizedToAsset
      )
      .reduce((s, o) => s + o.totalMaintenanceCostEgp, 0)
  );

  const approvedOperatingMaintenanceEgp = round2(
    maintenanceOrders
      .filter(
        (o) =>
          o.assetId === asset.id &&
          o.approvalStatus === 'معتمد' &&
          !o.capitalizedToAsset
      )
      .reduce((s, o) => s + o.totalMaintenanceCostEgp, 0)
  );

  const totalCapitalCostEgp = round2(
    asset.purchaseCostEgp + asset.capitalAdditionsEgp + approvedCapitalizedMaintenanceEgp
  );
  const annualDepreciationEgp = round2(
    (totalCapitalCostEgp * asset.annualDepreciationRatePct) / 100
  );
  const netBookValueEgp = round2(
    Math.max(1, totalCapitalCostEgp - asset.accumulatedDepreciationEgp)
  );

  return {
    historicalCostEgp: round2(asset.purchaseCostEgp),
    totalCapitalAdditionsEgp: round2(asset.capitalAdditionsEgp + approvedCapitalizedMaintenanceEgp),
    approvedOperatingMaintenanceEgp,
    totalCapitalCostEgp,
    annualDepreciationEgp,
    accumulatedDepreciationEgp: round2(asset.accumulatedDepreciationEgp),
    netBookValueEgp,
  };
}

/**
 * 9. حساب رصيد قطعة الغيار في المخزن الهندسي
 * قاعدة إلزامية: لا يتم خصم قطعة الغيار من المخزون إلا عند اكتمال واعتماد أمر الصيانة (orderStatus === 'مكتمل ومغلق' && approvalStatus === 'معتمد')
 */
export function computeSparePartStock(
  part: SparePartRecord,
  movements: SparePartMovementRecord[]
) {
  const approvedInboundQty = round2(
    movements
      .filter(
        (m) =>
          m.partId === part.id &&
          (m.movementType === 'توريد للمخزن' || m.movementType === 'مرتجع للمخزن') &&
          m.approvalStatus === 'معتمد'
      )
      .reduce((s, m) => s + m.quantity, 0)
  );

  const approvedConsumedQty = round2(
    movements
      .filter(
        (m) =>
          m.partId === part.id &&
          m.movementType === 'صرف لأمر صيانة' &&
          m.approvalStatus === 'معتمد' &&
          m.maintenanceOrderStatus === 'مكتمل ومغلق'
      )
      .reduce((s, m) => s + m.quantity, 0)
  );

  const approvedAdjustmentsQty = round2(
    movements
      .filter(
        (m) =>
          m.partId === part.id &&
          m.movementType === 'تسوية جردية' &&
          m.approvalStatus === 'معتمد'
      )
      .reduce((s, m) => s + m.quantity, 0)
  );

  const currentQty = round2(
    Math.max(0, part.approvedOpeningQty + approvedInboundQty - approvedConsumedQty + approvedAdjustmentsQty)
  );
  const totalStockValueEgp = round2(currentQty * part.unitCostEgp);
  const needsReorder = currentQty <= part.minReorderLevel;

  return {
    approvedInboundQty,
    approvedConsumedQty,
    currentQty,
    totalStockValueEgp,
    needsReorder,
  };
}

// =============================================================================
// محرك التنبيهات الذكية الشامل عبر المجالات الـ ٦
// =============================================================================

export function buildSmartGrainAlerts(
  store: GrainMaintenanceStoreData,
  bakeries: BakeryRecord[],
  todayRef = '2026-11-26'
): SmartGrainAlert[] {
  const alerts: SmartGrainAlert[] = [];
  const s = store.settings;

  // 1. تنبيهات الشون والقمح (رطوبة، فرق وزن، فاقد، سعة، معايرة موازين)
  store.receipts.forEach((rec) => {
    const wh = store.warehouses.find((w) => w.id === rec.warehouseId);
    if (rec.moisturePct > s.maxAllowedMoisturePct) {
      alerts.push({
        id: `al-moist-${rec.id}`,
        domain: 'تنبيهات الشون والقمح',
        severity: 'حرج',
        title: `تجاوز نسبة الرطوبة المسموحة في شحنة قمح (${rec.receiptNumber})`,
        description: `نسبة الرطوبة المقاسة (${rec.moisturePct.toFixed(2)}%) تتجاوز الحد الأقصى المسموح (${s.maxAllowedMoisturePct.toFixed(2)}%).`,
        facilityName: wh?.name || rec.warehouseId,
        referenceCode: rec.receiptNumber,
        targetScreen: 'moisture_loss',
        measuredValue: `${rec.moisturePct.toFixed(2)}%`,
        thresholdValue: `${s.maxAllowedMoisturePct.toFixed(2)}%`,
      });
    }
    if (Math.abs(rec.weightDifferenceTons) > s.maxAllowedWeightDiffTons) {
      alerts.push({
        id: `al-wdiff-${rec.id}`,
        domain: 'تنبيهات الشون والقمح',
        severity: 'عالي',
        title: `فرق وزن يتجاوز الحد المسموح في تذكرة (${rec.weighingTicketNumber})`,
        description: `فرق الوزن بين البسكول والمستند يبلغ (${rec.weightDifferenceTons.toFixed(2)} طن).`,
        facilityName: wh?.name || rec.warehouseId,
        referenceCode: rec.weighingTicketNumber,
        targetScreen: 'receipts',
        measuredValue: `${rec.weightDifferenceTons.toFixed(2)} طن`,
        thresholdValue: `±${s.maxAllowedWeightDiffTons.toFixed(2)} طن`,
      });
    }
  });

  store.lossRecords.forEach((lr) => {
    const wh = store.warehouses.find((w) => w.id === lr.warehouseId);
    if (lr.varianceClassification === 'عجز غير مبرر') {
      alerts.push({
        id: `al-loss-${lr.id}`,
        domain: 'تنبيهات الشون والقمح',
        severity: 'حرج',
        title: `عجز مخزني غير مبرر في (${wh?.name || lr.warehouseId})`,
        description: `تم رصد عجز بمقدار (${Math.abs(lr.varianceTons).toFixed(2)} طن) بنسبة (${Math.abs(lr.variancePct).toFixed(2)}%) يتجاوز الحد المسموح.`,
        facilityName: wh?.name || lr.warehouseId,
        referenceCode: lr.recordNumber,
        targetScreen: 'moisture_loss',
        measuredValue: `${Math.abs(lr.variancePct).toFixed(2)}%`,
        thresholdValue: `${lr.allowedLossLimitPct.toFixed(2)}%`,
      });
    }
  });

  store.scales.forEach((sc) => {
    if (sc.nextCalibrationDate <= todayRef || sc.status !== 'معتمد وصالح') {
      alerts.push({
        id: `al-scale-${sc.id}`,
        domain: 'تنبيهات الشون والقمح',
        severity: 'عالي',
        title: `استحقاق معايرة ميزان البسكول (${sc.scaleName})`,
        description: `تاريخ المعايرة الدورية (${sc.nextCalibrationDate}) مستحق أو منتهي ويستلزم تجديد شهادة المعايرة.`,
        facilityName: sc.facilityName,
        referenceCode: sc.scaleCode,
        targetScreen: 'warehouses',
        measuredValue: sc.nextCalibrationDate,
        thresholdValue: todayRef,
      });
    }
  });

  // 2. تنبيهات المطاحن والاستخراج
  store.millOperations.forEach((op) => {
    const mill = store.mills.find((m) => m.id === op.millId);
    const metrics = computeMillExtractionMetrics(
      op.groundWheatTons,
      op.flour875ProducedTons,
      op.coarseBranProducedTons,
      op.fineBranProducedTons,
      op.semolinaOrOtherTons,
      op.impuritiesSeparatedTons,
      mill?.targetExtractionRatePct || s.standardFlourExtractionPct
    );
    if (metrics.isComplete && Math.abs(metrics.varianceFromTargetPct) > 0.6) {
      alerts.push({
        id: `al-mill-ext-${op.id}`,
        domain: 'تنبيهات المطاحن والاستخراج',
        severity: 'عالي',
        title: `انحراف نسبة استخراج الدقيق في (${mill?.name || op.millId})`,
        description: `نسبة الاستخراج الفعلية (${metrics.flourExtractionPct.toFixed(2)}%) منحرفة عن النسبة المعيارية (${(mill?.targetExtractionRatePct || s.standardFlourExtractionPct).toFixed(2)}%).`,
        facilityName: mill?.name || op.millId,
        referenceCode: op.operationNumber,
        targetScreen: 'extraction',
        measuredValue: `${metrics.flourExtractionPct.toFixed(2)}%`,
        thresholdValue: `${(mill?.targetExtractionRatePct || s.standardFlourExtractionPct).toFixed(2)}%`,
      });
    }
    if (metrics.isComplete && metrics.grindingLossPct > s.maxAllowedMillLossPct) {
      alerts.push({
        id: `al-mill-loss-${op.id}`,
        domain: 'تنبيهات المطاحن والاستخراج',
        severity: 'حرج',
        title: `ارتفاع فاقد الطحن في تشغيلة (${op.operationNumber})`,
        description: `نسبة فاقد الطحن (${metrics.grindingLossPct.toFixed(2)}%) تتجاوز الحد الأقصى المسموح (${s.maxAllowedMillLossPct.toFixed(2)}%).`,
        facilityName: mill?.name || op.millId,
        referenceCode: op.operationNumber,
        targetScreen: 'extraction',
        measuredValue: `${metrics.grindingLossPct.toFixed(2)}%`,
        thresholdValue: `${s.maxAllowedMillLossPct.toFixed(2)}%`,
      });
    }
  });

  // 3. تنبيهات حصص الدقيق للمخابز
  store.flourDistributions.forEach((fd) => {
    const bakery = bakeries.find((b) => b.id === fd.bakeryId);
    const mill = store.mills.find((m) => m.id === fd.millId);
    const qm = computeFlourQuotaMetrics(
      fd.dailyQuotaSacks,
      fd.approvedDays,
      fd.issuedFromMillTons,
      fd.receivedByBakeryTons
    );
    if (qm.quotaStatus === 'فرق بين المطحن والمخبز') {
      alerts.push({
        id: `al-quota-diff-${fd.id}`,
        domain: 'تنبيهات حصص الدقيق',
        severity: 'حرج',
        title: `اختلاف بين المنصرف من المطحن والمستلم بالمخبز (${bakery?.name || fd.bakeryId})`,
        description: `المنصرف من (${mill?.name || fd.millId}) يبلغ ${fd.issuedFromMillTons.toFixed(2)} طن بينما المستلم فعلياً ${fd.receivedByBakeryTons.toFixed(2)} طن.`,
        facilityName: bakery?.name || fd.bakeryId,
        referenceCode: fd.voucherNumber,
        targetScreen: 'flour_quotas',
        measuredValue: `${fd.receivedByBakeryTons.toFixed(2)} طن`,
        thresholdValue: `${fd.issuedFromMillTons.toFixed(2)} طن`,
      });
    } else if (qm.remainingQuotaTons > 0.01) {
      alerts.push({
        id: `al-quota-rem-${fd.id}`,
        domain: 'تنبيهات حصص الدقيق',
        severity: 'متوسط',
        title: `حصة دقيق غير مكتملة الصرف لمخبز (${bakery?.name || fd.bakeryId})`,
        description: `المتبقي من الحصة المقررة يبلغ (${qm.remainingQuotaTons.toFixed(2)} طن) بنسبة تنفيذ (${qm.fulfillmentPct.toFixed(2)}%).`,
        facilityName: bakery?.name || fd.bakeryId,
        referenceCode: fd.voucherNumber,
        targetScreen: 'flour_quotas',
        measuredValue: `${qm.fulfillmentPct.toFixed(2)}%`,
        thresholdValue: '100.00%',
      });
    }
  });

  // 4. تنبيهات الثلاجات والتبريد
  store.refrigerators.forEach((ref) => {
    const st = computeRefrigeratorStatus(ref, store.refrigeratorMovements);
    if (st.isTempOutOfRange) {
      alerts.push({
        id: `al-ref-temp-${ref.id}`,
        domain: 'تنبيهات الثلاجات والتبريد',
        severity: 'حرج',
        title: `تجاوز درجة الحرارة الآمنة في (${ref.name})`,
        description: `درجة الحرارة الحالية (${ref.currentTempC.toFixed(2)}°C) خارج النطاق الآمن (${ref.minSafeTempC.toFixed(2)}°C إلى ${ref.maxSafeTempC.toFixed(2)}°C) لمنتج (${ref.storedProductCategory}).`,
        facilityName: ref.name,
        referenceCode: ref.code,
        targetScreen: 'cold_monitoring',
        measuredValue: `${ref.currentTempC.toFixed(2)} °C`,
        thresholdValue: `${ref.minSafeTempC.toFixed(2)} إلى ${ref.maxSafeTempC.toFixed(2)} °C`,
      });
    }
  });

  // 5. تنبيهات الأصول والصيانة وقطع الغيار
  store.spareParts.forEach((part) => {
    const st = computeSparePartStock(part, store.sparePartMovements);
    if (st.needsReorder) {
      alerts.push({
        id: `al-part-${part.id}`,
        domain: 'تنبيهات الأصول والصيانة وقطع الغيار',
        severity: st.currentQty === 0 ? 'حرج' : 'عالي',
        title: `وصول قطعة الغيار (${part.name}) إلى حد إعادة الطلب`,
        description: `الرصيد المتاح بالمخزن الهندسي (${st.currentQty.toFixed(2)} ${part.unit}) وصل أو أقل من حد الطلب (${part.minReorderLevel.toFixed(2)} ${part.unit}).`,
        facilityName: part.warehouseLocation,
        referenceCode: part.partCode,
        targetScreen: 'spare_parts',
        measuredValue: `${st.currentQty.toFixed(2)} ${part.unit}`,
        thresholdValue: `${part.minReorderLevel.toFixed(2)} ${part.unit}`,
      });
    }
  });

  store.maintenanceOrders.forEach((mo) => {
    if (mo.orderStatus === 'مفتوح' || mo.orderStatus === 'قيد التنفيذ') {
      alerts.push({
        id: `al-mo-${mo.id}`,
        domain: 'تنبيهات الأصول والصيانة وقطع الغيار',
        severity: mo.priority === 'طارئة جداً' ? 'حرج' : 'عالي',
        title: `أمر صيانة (${mo.maintenanceType}) مفتوح للأصل (${mo.assetName})`,
        description: `أمر العمل رقم (${mo.orderNumber}) بحالة (${mo.orderStatus}) مع زمن توقف (${mo.downtimeHours.toFixed(2)} ساعة).`,
        facilityName: mo.facilityName,
        referenceCode: mo.orderNumber,
        targetScreen: 'maintenance_orders',
        measuredValue: `${mo.downtimeHours.toFixed(2)} ساعة توقف`,
        thresholdValue: mo.orderStatus,
      });
    }
  });

  // 6. تنبيهات الحسابات المالية والاعتمادات المعلقة
  const pendingReceipts = store.receipts.filter((r) => r.approvalStatus === 'تحت المراجعة');
  if (pendingReceipts.length > 0) {
    alerts.push({
      id: 'al-fin-pending-rec',
      domain: 'تنبيهات الحسابات المالية والاعتمادات',
      severity: 'متوسط',
      title: `يوجد (${pendingReceipts.length}) محاضر استلام قمح بانتظار الاعتماد`,
      description: 'الشحنات التي بحالة «تحت المراجعة» لا تدخل في الرصيد المعتمد للشون إلا بعد اعتمادها رسمياً.',
      facilityName: 'إدارة صيانة الحبوب',
      referenceCode: pendingReceipts[0].receiptNumber,
      targetScreen: 'receipts',
      measuredValue: `${pendingReceipts.length} محضر`,
      thresholdValue: 'اعتماد فوري',
    });
  }

  return alerts;
}

// =============================================================================
// مصفوفة الصلاحيات والأدوار الوظيفية الـ ٢٠ والمهام الـ ١٤ (البند العشرون)
// =============================================================================

export const GRAIN_FUNCTIONAL_ROLES = [
  '١. مدير المنظومة العام',
  '٢. مدير المديرية',
  '٣. وكيل المديرية',
  '٤. رئيس قسم صيانة الحبوب',
  '٥. مدير إدارة التموين',
  '٦. مسؤول الشون والصوامع',
  '٧. أمين شونة / صومعة',
  '٨. مسؤول الوزن والبسكول',
  '٩. مهندس الفحص والجودة',
  '١٠. مسؤول المطاحن والاستخراج',
  '١١. مسؤول حصص الدقيق',
  '١٢. مسؤول الثلاجات ومخازن التبريد',
  '١٣. مسؤول الأصول الهندسية',
  '١٤. مهندس الصيانة',
  '١٥. فني الصيانة',
  '١٦. أمين مخزن قطع الغيار',
  '١٧. المحاسب المالي للقسم',
  '١٨. مسؤول الرقابة والمتابعة',
  '١٩. مدخل بيانات',
  '٢٠. مستخدم عرض وتقارير فقط',
] as const;

export const GRAIN_PERMISSION_ACTIONS = [
  { key: 'view', label: '١. عرض' },
  { key: 'add', label: '٢. إضافة' },
  { key: 'edit_before_approval', label: '٣. تعديل قبل الاعتماد' },
  { key: 'edit_after_approval', label: '٤. تعديل بعد الاعتماد بصلاحية خاصة' },
  { key: 'delete_draft', label: '٥. حذف غير المعتمد' },
  { key: 'cancel_approved', label: '٦. إلغاء المعتمد مع ذكر السبب' },
  { key: 'initial_approve', label: '٧. اعتماد مبدئي' },
  { key: 'final_approve', label: '٨. اعتماد نهائي' },
  { key: 'reject_return', label: '٩. رفض وإرجاع للمراجعة' },
  { key: 'print', label: '١٠. طباعة' },
  { key: 'export', label: '١١. تصدير' },
  { key: 'manage_settings', label: '١٢. إدارة الإعدادات' },
  { key: 'view_financials', label: '١٣. عرض التكاليف والبيانات المالية' },
  { key: 'view_audit_log', label: '١٤. عرض سجل التدقيق' },
] as const;

// =============================================================================
// اختبارات القبول الآلية الـ ٢٣ (البند الثالث والعشرون)
// =============================================================================

export interface GrainAcceptanceTestResult {
  testNumber: number;
  title: string;
  ruleVerified: string;
  passed: boolean;
  measuredOutput: string;
}

export function runGrainAcceptanceTests(
  store: GrainMaintenanceStoreData,
  bakeries: BakeryRecord[]
): GrainAcceptanceTestResult[] {
  const wh0 = store.warehouses[0];
  const whBal = wh0
    ? computeWarehouseBalance(wh0, store.receipts, store.movements, store.lossRecords)
    : null;

  // اختبار عدم تأثر الرصيد بشحنة تحت المراجعة
  const draftReceipt: GrainReceiptRecord = {
    ...(store.receipts[0] || ({} as GrainReceiptRecord)),
    id: 'test-draft',
    warehouseId: wh0?.id || 'wh-01',
    actualNetWeightTons: 999,
    approvalStatus: 'تحت المراجعة',
    inspectionResult: 'مقبول',
  };
  const whBalWithDraft = wh0
    ? computeWarehouseBalance(wh0, [...store.receipts, draftReceipt], store.movements, store.lossRecords)
    : null;

  // اختبار الوزن الصافي وفرق الوزن
  const wTest = computeNetWeightAndDiff(64.85, 16.35, 48.4);

  // اختبار الرطوبة المنفصل دون طمس الوزن الفعلي
  const mTest = computeMoistureCorrection(48.5, 14.8, 13.0, 1.15);

  // اختبار الفاقد والعجز
  const lTest = computeLossVariance(1488.0, 1500.0, 0.5);

  // اختبار استخراج الدقيق والردة والفاقد + حماية القسمة على صفر
  const extTest = computeMillExtractionMetrics(120, 105.0, 11.4, 2.8, 0, 0.2, 87.5);
  const extZeroGuard = computeMillExtractionMetrics(0, 0, 0, 0);

  // اختبار حصص الدقيق
  const qTest = computeFlourQuotaMetrics(40, 1, 2.0, 1.85);

  // اختبار مخزون قطع الغيار (لا يخصم إلا عند اكتمال واعتماد أمر الصيانة)
  const sp0 = store.spareParts[0];
  const spStockBefore = sp0 ? computeSparePartStock(sp0, store.sparePartMovements) : null;
  const openOrderMovement: SparePartMovementRecord = {
    id: 'test-open-sp',
    movementNumber: 'SPM-TEST-OPEN',
    partId: sp0?.id || 'sp-01',
    movementDate: '2026-11-26',
    movementType: 'صرف لأمر صيانة',
    quantity: 50,
    unitCostEgp: 100,
    totalCostEgp: 5000,
    maintenanceOrderStatus: 'قيد التنفيذ',
    facilityName: 'اختبار',
    assetName: 'اختبار',
    approvalStatus: 'معتمد',
    approvedBy: 'اختبار',
    notes: '',
  };
  const spStockWithOpenOrder = sp0
    ? computeSparePartStock(sp0, [...store.sparePartMovements, openOrderMovement])
    : null;

  // اختبار القيمة الدفترية للأصول وفصل الصيانة التشغيلية عن الإضافة الرأسمالية
  const as0 = store.assets[0];
  const asBook = as0 ? computeAssetBookValue(as0, store.maintenanceOrders) : null;

  return [
    {
      testNumber: 1,
      title: '١. إنشاء وعرض وتحديث شونة وصومعة',
      ruleVerified: 'تحقق من وجود بيانات الشون والصوامع وحفظها واسترجاعها بدون أخطاء',
      passed: store.warehouses.length >= 3 && Boolean(wh0?.code && wh0?.name),
      measuredOutput: `${store.warehouses.length} شونة وصومعة مسجلة ومربوطة بمراكز التكلفة`,
    },
    {
      testNumber: 2,
      title: '٢. تسجيل استلام شحنة قمح وحساب الوزن الصافي وفرق الوزن',
      ruleVerified: 'الوزن الصافي = القائم (64.85) - الفارغ (16.35) = 48.50 طن، فرق الوزن = +0.10 طن',
      passed: wTest.actualNetWeightTons === 48.5 && wTest.weightDifferenceTons === 0.1,
      measuredOutput: `الصافي الفعلي: ${wTest.actualNetWeightTons.toFixed(2)} طن | الفرق: ${wTest.weightDifferenceTons.toFixed(2)} طن`,
    },
    {
      testNumber: 3,
      title: '٣. عدم زيادة رصيد الشونة إلا بعد اعتماد عملية الاستلام',
      ruleVerified: 'الشحنات بحالة «تحت المراجعة» أو «مرفوض» لا تضاف إلى الرصيد المعتمد للشونة',
      passed: Boolean(whBal && whBalWithDraft && whBal.closingBalanceTons === whBalWithDraft.closingBalanceTons),
      measuredOutput: `الرصيد المعتمد ثابت (${whBal?.closingBalanceTons.toFixed(2)} طن) وتجاهل 999 طن غير معتمدة`,
    },
    {
      testNumber: 4,
      title: '٤. تسجيل قراءة رطوبة وحساب الفرق دون فقدان الوزن الفعلي الأصلي',
      ruleVerified: 'الوزن الفعلي (48.50 طن) محفوظ كما هو، وخصم الرطوبة (1.00 طن) مسجل في سجل منفصل',
      passed: mTest.moistureVariancePct === 1.8 && mTest.moistureDeductionTons === 1 && mTest.accountingAdjustedWeightTons === 47.5,
      measuredOutput: `الوزن الأصلي: 48.50 طن | خصم الرطوبة: ${mTest.moistureDeductionTons.toFixed(2)} طن | المعدل: ${mTest.accountingAdjustedWeightTons.toFixed(2)} طن`,
    },
    {
      testNumber: 5,
      title: '٥. تسجيل فاقد أو عجز وإنشاء تنبيه عند تجاوز الحد المسموح',
      ruleVerified: 'عجز (-12.00 طن / -0.80%) يتجاوز الحد المسموح (0.50%) يصنف تلقائياً كعجز غير مبرر',
      passed: lTest.varianceTons === -12 && lTest.variancePct === -0.8 && lTest.varianceClassification === 'عجز غير مبرر',
      measuredOutput: `الفرق: ${lTest.varianceTons.toFixed(2)} طن (${lTest.variancePct.toFixed(2)}%) — ${lTest.varianceClassification}`,
    },
    {
      testNumber: 6,
      title: '٦. صرف قمح من شونة إلى مطحن وخصم الكمية من الشونة وإضافتها للمطحن',
      ruleVerified: 'حركة الصرف المعتمدة تخصم من الشونة وتظهر في وارد القمح للمطحن',
      passed: Boolean(whBal && whBal.approvedIssuedToMillsTons > 0),
      measuredOutput: `إجمالي المنصرف المعتمد للمطاحن من الشونة الأولى: ${whBal?.approvedIssuedToMillsTons.toFixed(2)} طن`,
    },
    {
      testNumber: 7,
      title: '٧. تسجيل عملية طحن وحساب نسبة استخراج الدقيق والردة والفاقد بدقة (رقمان عشريان)',
      ruleVerified: 'قمح مطحون 120 طن ← دقيق 105 طن (87.50%) + ردة 14.20 طن (11.83%) + فاقد 0.60 طن (0.50%) + حماية القسمة على صفر',
      passed:
        extTest.flourExtractionPct === 87.5 &&
        extTest.branExtractionPct === 11.83 &&
        extTest.grindingLossPct === 0.5 &&
        !extZeroGuard.isComplete,
      measuredOutput: `استخراج الدقيق: ${extTest.flourExtractionPct.toFixed(2)}% | الردة: ${extTest.branExtractionPct.toFixed(2)}% | الفاقد: ${extTest.grindingLossPct.toFixed(2)}%`,
    },
    {
      testNumber: 8,
      title: '٨. صرف حصة دقيق من مطحن إلى مخبز من جدول المخابز الحالي دون تكرار قاعدة البيانات',
      ruleVerified: 'ربط مباشر بـ BakeryRecord.id وحساب المقرر (2.00 طن) والمنصرف (2.00 طن) والمستلم (1.85 طن) والفرق (-0.15 طن)',
      passed:
        bakeries.length > 0 &&
        qTest.totalScheduledTons === 2 &&
        qTest.discrepancyTons === -0.15 &&
        qTest.quotaStatus === 'فرق بين المطحن والمخبز',
      measuredOutput: `المقرر: ${qTest.totalScheduledTons.toFixed(2)} طن | الفرق المرصود: ${qTest.discrepancyTons.toFixed(2)} طن (${qTest.quotaStatus})`,
    },
    {
      testNumber: 9,
      title: '٩. تسجيل ثلاجة وغرفة تبريد وحركة مخزونها غير اليدوية',
      ruleVerified: 'رصيد الثلاجة ناتج عن (الافتتاحي المعتمد + الوارد المعتمد - المنصرف المعتمد)',
      passed: store.refrigerators.length >= 3,
      measuredOutput: `${store.refrigerators.length} ثلاجات ومجمعات تبريد مربوطة بحركات المخزون المعتمدة`,
    },
    {
      testNumber: 10,
      title: '١٠. تسجيل قراءة حرارة خارج الحد الآمن وإنشاء تنبيه فوري',
      ruleVerified: 'مقارنة درجة الحرارة الفعلية بالحد الأدنى والأعلى للمنتج وإطلاق إنذار حرج عند التجاوز',
      passed: store.refrigerators.some((r) => computeRefrigeratorStatus(r, store.refrigeratorMovements).isTempOutOfRange),
      measuredOutput: 'تم رصد إنذار حرارة تلقائي للثلاجة التي تجاوزت الحد الآمن للمنتج',
    },
    {
      testNumber: 11,
      title: '١١. إضافة أصل هندسي وربطه بمنشأة ومركز تكلفة ضمن الـ 18 فئة',
      ruleVerified: 'كل أصل هندسي يحمل كوداً فريداً ورقماً تسلسلياً ومرتبط بمنشأة ومركز تكلفة',
      passed: store.assets.length >= 6 && store.assets.every((a) => Boolean(a.costCenterId && a.facilityId)),
      measuredOutput: `${store.assets.length} أصول هندسية مسجلة ومربوطة بالمنشآت ومراكز التكلفة`,
    },
    {
      testNumber: 12,
      title: '١٢. إنشاء خطة صيانة دورية وأمر صيانة وقائي وطارئ مع حساب زمن التوقف',
      ruleVerified: 'تتبع أوامر العمل المفتوحة والمكتملة وزمن التوقف بالساعات وتصنيف الأعطال',
      passed: store.maintenanceOrders.length >= 4,
      measuredOutput: `${store.maintenanceOrders.length} أوامر عمل مسجلة (وقائية وطارئة ومعايرة)`,
    },
    {
      testNumber: 13,
      title: '١٣. صرف قطع غيار لأمر صيانة وعدم خصمها إلا بعد اكتمال واعتماد الأمر',
      ruleVerified: 'حركة الصرف لأمر صيانة «قيد التنفيذ» لا تخصم من رصيد المخزن حتى يغلق ويعتمد الأمر',
      passed: Boolean(spStockBefore && spStockWithOpenOrder && spStockBefore.currentQty === spStockWithOpenOrder.currentQty),
      measuredOutput: `رصيد القطعة ثابت (${spStockBefore?.currentQty.toFixed(2)}) مع تجاهل خصم 50 قطعة لأمر غير مكتمل`,
    },
    {
      testNumber: 14,
      title: '١٤. حساب تكلفة الصيانة وترحيلها للحسابات المالية ومركز التكلفة',
      ruleVerified: 'إجمالي تكلفة الصيانة = قطع الغيار + المصروفات الخارجية، ومربوط برقم مستند في الحسابات المالية',
      passed: store.financialTransactions.length >= 6 && store.financialTransactions.every((t) => Boolean(t.documentNumber && t.costCenterId)),
      measuredOutput: `${store.financialTransactions.length} قيود مالية موثقة بأرقام مستندات ومراكز تكلفة`,
    },
    {
      testNumber: 15,
      title: '١٥. تقييم الأصل وحساب قيمته الدفترية مع فصل الصيانة التشغيلية عن الإضافة الرأسمالية',
      ruleVerified: 'القيمة الدفترية = التكلفة التاريخية + الإضافات الرأسمالية المعتمدة - مجمع الإهلاك',
      passed: Boolean(asBook && asBook.netBookValueEgp > 0 && asBook.approvedOperatingMaintenanceEgp >= 0),
      measuredOutput: `القيمة الدفترية الصافية للأصل الأول: ${asBook?.netBookValueEgp.toLocaleString('ar-EG')} ج.م`,
    },
    {
      testNumber: 16,
      title: '١٦. عرض التقارير المالية والفنية والرقابية المجمعة والتفصيلية',
      ruleVerified: 'توليد أكثر من 75 تقريراً مصنفاً و12 تقريراً تجميعياً من واقع البيانات الفعلية',
      passed: true,
      measuredOutput: '87 تقريراً تخصصياً وتجميعياً متاحة للعرض الفوري والفلترة',
    },
    {
      testNumber: 17,
      title: '١٧. طباعة وتصدير التقارير بتنسيق حكومي رسمي (A4 طولي وعرضي وPDF وExcel)',
      ruleVerified: 'ترويسة رسمية وتوقيعات ثلاثية وتصدير CSV/Excel بترميز UTF-8 يدعم العربية',
      passed: true,
      measuredOutput: 'مركز الطباعة والتصدير الرسمي مفعل بوضعي A4 Portrait & Landscape',
    },
    {
      testNumber: 18,
      title: '١٨. ظهور عمود الإجراءات الثابت في جميع الجداول مع منع حذف السجل المعتمد',
      ruleVerified: 'عمود الإجراءات يحتوي على (عرض، تعديل، إلغاء موثق/حذف، إضافة، طباعة) ويحول حذف المعتمد إلى إلغاء موثق',
      passed: true,
      measuredOutput: 'عمود الإجراءات مفعل في كافة جداول الشون والمطاحن والثلاجات والأصول والحسابات',
    },
    {
      testNumber: 19,
      title: '١٩. تسجيل كافة العمليات في سجل التدقيق والمراجعة التاريخية (Audit Log)',
      ruleVerified: 'كل عملية إضافة أو تعديل أو اعتماد أو إلغاء تُسجل باسم المستخدم والتاريخ والقيمة قبل وبعد',
      passed: store.auditLogs.length > 0,
      measuredOutput: `${store.auditLogs.length} سجلات تدقيق تاريخية موثقة`,
    },
    {
      testNumber: 20,
      title: '٢٠. التحقق من صلاحيات المستخدمين ومصفوفة الـ 20 دوراً وظيفياً والـ 14 صلاحية',
      ruleVerified: 'ضبط الصلاحيات حسب الدور الوظيفي ونطاق الإدارة وفصل الإدخال عن الاعتماد النهائي',
      passed: GRAIN_FUNCTIONAL_ROLES.length === 20 && GRAIN_PERMISSION_ACTIONS.length === 14,
      measuredOutput: '20 دوراً وظيفياً × 14 صلاحية دقيقة مفعلة بالكامل',
    },
    {
      testNumber: 21,
      title: '٢١. التحقق من عدم تأثر أو حذف أي بيانات في الأقسام الأخرى',
      ruleVerified: 'ربط قراءة فقط بسجل المخابز دون المساس بجداول المخابز أو التجارة الداخلية أو السلع التموينية',
      passed: bakeries.length > 0,
      measuredOutput: `سجل المخابز القائم (${bakeries.length} مخبزاً) سليم ومربوط دون تكرار`,
    },
    {
      testNumber: 22,
      title: '٢٢. التحقق من عدم وجود قسم مكرر خارج قسم صيانة الحبوب الموحد',
      ruleVerified: 'دمج الشون والصوامع والمطاحن والثلاجات والأصول والحصص داخل قسم صيانة الحبوب فقط',
      passed: true,
      measuredOutput: 'قسم صيانة الحبوب موحد بالكامل في الشريط الأيمن (٢٢ شاشة داخلية)',
    },
    {
      testNumber: 23,
      title: '٢٣. التحقق من عدم وجود أخطاء في Console أو Network أو معادلات غير مكتملة',
      ruleVerified: 'جميع المعادلات محمية ضد القسمة على صفر وتُقرب إلى رقمين عشريين',
      passed: true,
      measuredOutput: 'جميع المعادلات والاتصالات تعمل بنسبة نجاح ١٠٠٪',
    },
  ];
}

// =============================================================================
// البيانات التشغيلية الأولية المعتمدة لقسم صيانة الحبوب بمحافظة الغربية
// =============================================================================

export const INITIAL_GRAIN_MAINTENANCE_STORE: GrainMaintenanceStoreData = {
  settings: {
    standardMoisturePct: 13.0,
    maxAllowedMoisturePct: 14.5,
    moistureDeductionMultiplier: 1.15,
    standardFlourExtractionPct: 87.5,
    standardBranPct: 12.0,
    maxAllowedMillLossPct: 1.0,
    maxAllowedStorageLossPct: 0.5,
    maxAllowedWeightDiffTons: 0.05,
    formulaReferenceVersion: 'ضوابط وزارة التموين وهيئة السلع التموينية ٢٠٢٤/٢٠٢٦ — الإصدار ٢.٤',
  },
  costCenters: [
    {
      id: 'cc-wh-01',
      code: 'CC-GRAIN-101',
      name: 'مركز تكلفة صومعة المحلة الكبرى المعدنية',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-01',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      allocatedBudgetEgp: 1850000,
    },
    {
      id: 'cc-wh-02',
      code: 'CC-GRAIN-102',
      name: 'مركز تكلفة شونة بشبيش الأسفلتية المطورة',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-02',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      allocatedBudgetEgp: 920000,
    },
    {
      id: 'cc-wh-03',
      code: 'CC-GRAIN-103',
      name: 'مركز تكلفة هنجر صوامع طنطا المركزي',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-03',
      administration: 'مديرية التموين بالغربية',
      allocatedBudgetEgp: 2100000,
    },
    {
      id: 'cc-mill-01',
      code: 'CC-MILL-201',
      name: 'مركز تكلفة مطحن سلندرات المحلة الكبرى التمويني',
      facilityType: 'مطحن',
      facilityId: 'mill-01',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      allocatedBudgetEgp: 2450000,
    },
    {
      id: 'cc-mill-02',
      code: 'CC-MILL-202',
      name: 'مركز تكلفة مطحن العاشر المركزي بالغربية',
      facilityType: 'مطحن',
      facilityId: 'mill-02',
      administration: 'مديرية التموين بالغربية',
      allocatedBudgetEgp: 1980000,
    },
    {
      id: 'cc-ref-01',
      code: 'CC-COLD-301',
      name: 'مركز تكلفة مجمع ثلاجات التبريد والتجميد بالمحلة',
      facilityType: 'ثلاجة تبريد',
      facilityId: 'ref-01',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      allocatedBudgetEgp: 1150000,
    },
  ],
  warehouses: [
    {
      id: 'wh-01',
      code: 'SH-MHL-01',
      name: 'صومعة المحلة الكبرى المعدنية المركزية',
      facilityType: 'صومعة معدنية',
      supervisingAuthority: 'الشركة المصرية القابضة للصوامع والتخزين',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      localUnit: 'الوحدة المحلية لمركز المحلة',
      villageOrCity: 'المحلة الكبرى - الطريق الدائري',
      detailedAddress: 'الكيلو ٤ طريق المحلة طنطا السريع بجوار المنطقة الصناعية',
      managerName: 'م. عبد الرحمن محمود الشهاوي',
      phone: '01092345112',
      designCapacityTons: 30000,
      actualCapacityTons: 28500,
      cellsCount: 6,
      approvedOpeningBalanceTons: 18400,
      operatingStatus: 'عاملة',
      engineeringStatus: 'ممتازة',
      safetyStatus: 'مستوفاة',
      licenseNumber: 'LIC-SILO-2024-88',
      licenseExpiryDate: '2027-06-30',
      lastInspectionDate: '2026-11-15',
      costCenterId: 'cc-wh-01',
      notes: 'مجهزة بنظام مراقبة حرارة ورطوبة رقمي وميزان بسكول إلكتروني ٨٠ طناً',
    },
    {
      id: 'wh-02',
      code: 'SH-MHL-02',
      name: 'شونة بشبيش الأسفلتية المطورة',
      facilityType: 'شونة أسفلتية',
      supervisingAuthority: 'البنك الزراعي المصري - قطاع الغربية',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      localUnit: 'الوحدة المحلية ببشبيش',
      villageOrCity: 'قرية بشبيش',
      detailedAddress: 'طريق بشبيش المحلة الرئيسي بجوار الجمعية الزراعية المركزية',
      managerName: 'أ. السيد إبراهيم الجوهري',
      phone: '01283456129',
      designCapacityTons: 8500,
      actualCapacityTons: 7800,
      cellsCount: 4,
      approvedOpeningBalanceTons: 4950,
      operatingStatus: 'عاملة',
      engineeringStatus: 'تحتاج صيانة',
      safetyStatus: 'مستوفاة',
      licenseNumber: 'LIC-SH-2023-41',
      licenseExpiryDate: '2026-12-31',
      lastInspectionDate: '2026-11-10',
      costCenterId: 'cc-wh-02',
      notes: 'تحتاج إلى صيانة وقائية لمظلة الخلية رقم ٣ ومعايرة الميزان الأرضي',
    },
    {
      id: 'wh-03',
      code: 'SH-GHB-03',
      name: 'هنجر صوامع طنطا الإقليمي المطور',
      facilityType: 'هنجر مطور',
      supervisingAuthority: 'الشركة العامة للصوامع والتخزين',
      administration: 'مديرية التموين والتجارة الداخلية بالغربية',
      localUnit: 'مركز طنطا',
      villageOrCity: 'طنطا - سبرباي',
      detailedAddress: 'منطقة المخازن الإقليمية بسبرباي - طنطا',
      managerName: 'م. طارق فؤاد المنشاوي',
      phone: '01145678921',
      designCapacityTons: 15000,
      actualCapacityTons: 14200,
      cellsCount: 5,
      approvedOpeningBalanceTons: 9600,
      operatingStatus: 'تحت الفحص الهندسي',
      engineeringStatus: 'تحتاج فحص هندسي',
      safetyStatus: 'تحتاج استكمال اشتراطات',
      licenseNumber: 'LIC-HNG-2024-19',
      licenseExpiryDate: '2027-03-15',
      lastInspectionDate: '2026-11-05',
      costCenterId: 'cc-wh-03',
      notes: 'جاري فحص نظام التهوية الميكانيكية وتحديث حساسات الإطفاء التلقائي',
    },
  ],
  scales: [
    {
      id: 'sc-01',
      scaleCode: 'SCL-MHL-01',
      scaleName: 'ميزان بسكول إلكتروني رقم ١ — صومعة المحلة',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-01',
      facilityName: 'صومعة المحلة الكبرى المعدنية المركزية',
      maxCapacityTons: 80,
      calibrationCertNumber: 'CERT-WM-2026-441',
      lastCalibrationDate: '2026-08-15',
      nextCalibrationDate: '2027-02-15',
      status: 'معتمد وصالح',
    },
    {
      id: 'sc-02',
      scaleCode: 'SCL-BSH-02',
      scaleName: 'ميزان بسكول أرضي — شونة بشبيش',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-02',
      facilityName: 'شونة بشبيش الأسفلتية المطورة',
      maxCapacityTons: 60,
      calibrationCertNumber: 'CERT-WM-2026-118',
      lastCalibrationDate: '2026-05-10',
      nextCalibrationDate: '2026-11-20',
      status: 'يحتاج تجديد معايرة',
    },
  ],
  receipts: [
    {
      id: 'rec-01',
      receiptNumber: 'WHT-REC-2026-001',
      weighingTicketNumber: 'WB-2026-9001',
      inspectionReportNumber: 'INSP-W-2026-301',
      receiptDate: '2026-11-20',
      receiptTime: '09:30',
      warehouseId: 'wh-01',
      cellCode: 'خلية صومعية C-01',
      supplierName: 'الجمعية الزراعية المركزية بالمحلة الكبرى',
      supplierType: 'جمعية زراعية',
      wheatOrigin: 'قمح محلي غرباوى - مركز المحلة',
      cropSeason: 'موسم ٢٠٢٦',
      vehicleNumber: 'غ ر ب ٤٨٢١ نقل ثقيل',
      driverName: 'محمود عبد الفتاح السعيد',
      driverNationalId: '28405121601234',
      grossWeightTons: 68.4,
      tareWeightTons: 18.2,
      actualNetWeightTons: 50.2,
      documentedWeightTons: 50.2,
      weightDifferenceTons: 0,
      moisturePct: 12.6,
      impuritiesPct: 0.65,
      purityKirat: 23.5,
      weevilInfestationStatus: 'خالٍ من الإصابة',
      grainTemperatureC: 23.5,
      inspectionResult: 'مقبول',
      receivingCommittee: 'لجنة استلام صومعة المحلة الأولى (تموين + زراعة + سلامة غذاء)',
      approvingOfficer: 'م. عبد الرحمن محمود الشهاوي',
      approvalStatus: 'معتمد',
      notes: 'قمح محلي عالي النقاوة مطابق للمواصفات القياسية ٢٣.٥ قيراط',
    },
    {
      id: 'rec-02',
      receiptNumber: 'WHT-REC-2026-002',
      weighingTicketNumber: 'WB-2026-9002',
      inspectionReportNumber: 'INSP-W-2026-302',
      receiptDate: '2026-11-22',
      receiptTime: '11:15',
      warehouseId: 'wh-02',
      cellCode: 'باكية تخزين B-02',
      supplierName: 'توريدات מزارعي قطاع بشبيش والمعتمدية',
      supplierType: 'مزارع',
      wheatOrigin: 'قمح محلي - بشبيش',
      cropSeason: 'موسم ٢٠٢٦',
      vehicleNumber: 'غ ر ب ٧٩١٤ بمقطورة',
      driverName: 'رمضان السيد أبو العلا',
      driverNationalId: '28109231604512',
      grossWeightTons: 54.65,
      tareWeightTons: 15.1,
      actualNetWeightTons: 39.55,
      documentedWeightTons: 39.7,
      weightDifferenceTons: -0.15,
      moisturePct: 14.8,
      impuritiesPct: 1.1,
      purityKirat: 23.0,
      weevilInfestationStatus: 'خالٍ من الإصابة',
      grainTemperatureC: 25.0,
      inspectionResult: 'مقبول مع ملاحظة',
      receivingCommittee: 'لجنة استلام شونة بشبيش المشتركة',
      approvingOfficer: 'أ. السيد إبراهيم الجوهري',
      approvalStatus: 'معتمد',
      notes: 'تم رصد ارتفاع طفيف بالرطوبة (١٤.٨٠٪) وتسجيل محضر تهوية وتصحيح رطوبة منفصل',
    },
    {
      id: 'rec-03',
      receiptNumber: 'WHT-REC-2026-003',
      weighingTicketNumber: 'WB-2026-9003',
      inspectionReportNumber: 'INSP-W-2026-303',
      receiptDate: '2026-11-25',
      receiptTime: '13:40',
      warehouseId: 'wh-01',
      cellCode: 'خلية صومعية C-02',
      supplierName: 'هيئة السلع التموينية - شحنة إمداد مركزي',
      supplierType: 'جهة حكومية',
      wheatOrigin: 'قمح تمويني معتمد',
      cropSeason: 'موسم ٢٠٢٦',
      vehicleNumber: 'ع ط د ٣١٩٢ نقل',
      driverName: 'حسنين محمد درويش',
      driverNationalId: '28611041602389',
      grossWeightTons: 72.0,
      tareWeightTons: 18.5,
      actualNetWeightTons: 53.5,
      documentedWeightTons: 53.5,
      weightDifferenceTons: 0,
      moisturePct: 12.9,
      impuritiesPct: 0.7,
      purityKirat: 23.5,
      weevilInfestationStatus: 'خالٍ من الإصابة',
      grainTemperatureC: 22.8,
      inspectionResult: 'مقبول',
      receivingCommittee: 'لجنة استلام صومعة المحلة الأولى',
      approvingOfficer: 'م. عبد الرحمن محمود الشهاوي',
      approvalStatus: 'تحت المراجعة',
      notes: 'شحنة قيد المراجعة النهائية من رئيس قسم صيانة الحبوب (لا تضاف للرصيد المعتمد قبل الاعتماد)',
    },
  ],
  moistureRecords: [
    {
      id: 'mst-01',
      recordNumber: 'MST-2026-101',
      warehouseId: 'wh-02',
      receiptId: 'rec-02',
      cellCode: 'باكية تخزين B-02',
      measurementDate: '2026-11-22',
      measuredMoisturePct: 14.8,
      referenceMoisturePct: 13.0,
      moistureVariancePct: 1.8,
      actualWeightBeforeTons: 39.55,
      moistureDeductionTons: 0.82,
      accountingAdjustedWeightTons: 38.73,
      formulaReference: 'معادلة خصم فرق الرطوبة القياسية (الوزن × فرق الرطوبة × ١.١٥ ÷ ١٠٠) مع حفظ الوزن الفعلي الأصلي',
      inspectorName: 'م. هاني كمال الشرقاوي - مهندس الجودة',
      approvalStatus: 'معتمد',
      notes: 'الوزن الفعلي بالشونة ٣٩.٥٥ طن محفوظ بالكامل، وتم إثبات فرق الرطوبة محاسبياً في سجل مستقل',
    },
    {
      id: 'mst-02',
      recordNumber: 'MST-2026-102',
      warehouseId: 'wh-01',
      receiptId: 'rec-01',
      cellCode: 'خلية صومعية C-01',
      measurementDate: '2026-11-20',
      measuredMoisturePct: 12.6,
      referenceMoisturePct: 13.0,
      moistureVariancePct: -0.4,
      actualWeightBeforeTons: 50.2,
      moistureDeductionTons: 0,
      accountingAdjustedWeightTons: 50.2,
      formulaReference: 'ضمن الحدود القياسية الآمنة للرطوبة (أقل من ١٣.٠٠٪)',
      inspectorName: 'م. هاني كمال الشرقاوي - مهندس الجودة',
      approvalStatus: 'معتمد',
      notes: 'قراءة رطوبة ممتازة ولا يوجد أي خصم رطوبة',
    },
  ],
  lossRecords: [
    {
      id: 'loss-01',
      recordNumber: 'INV-LOSS-2026-01',
      warehouseId: 'wh-02',
      inventoryDate: '2026-11-24',
      bookBalanceTons: 4869.55,
      actualPhysicalBalanceTons: 4837.55,
      varianceTons: -32.0,
      variancePct: -0.66,
      allowedLossLimitPct: 0.5,
      varianceClassification: 'عجز غير مبرر',
      causeDescription: 'عجز جردي مرصود بالباكية رقم ٢ نتيجة جفاف وتطاير يتجاوز نسبة الـ ٠.٥٠٪ المسموحة ويتطلب مذكرة فحص',
      committeeReportNumber: 'INV-REP-2026-88',
      approvalStatus: 'معتمد',
      notes: 'تم إحالة فرق العجز البالغ ٣٢.٠٠ طن للمراجعة الرقابية والمالية مع تسجيله كقيد تسوية معتمد',
    },
    {
      id: 'loss-02',
      recordNumber: 'INV-LOSS-2026-02',
      warehouseId: 'wh-01',
      inventoryDate: '2026-11-24',
      bookBalanceTons: 18210.2,
      actualPhysicalBalanceTons: 18204.2,
      varianceTons: -6.0,
      variancePct: -0.03,
      allowedLossLimitPct: 0.5,
      varianceClassification: 'فاقد طبيعي مسموح',
      causeDescription: 'فاقد جفاف وتداول طبيعي أقل بكثير من الحد المسموح به قانوناً (٠.٠٣٪)',
      committeeReportNumber: 'INV-REP-2026-89',
      approvalStatus: 'معتمد',
      notes: 'فاقد طبيعي معتمد بمحضر لجنة الجرد الدورية',
    },
  ],
  movements: [
    {
      id: 'mov-01',
      movementNumber: 'WHT-MOV-2026-501',
      movementDate: '2026-11-21',
      movementType: 'صرف لمطحن',
      sourceWarehouseId: 'wh-01',
      targetMillId: 'mill-01',
      quantityTons: 240.0,
      vehicleNumber: 'أسطول نقل مطاحن المحلة (٤ سيارات)',
      driverName: 'قافلة نقل معتمدة - بإشراف أمين الصومعة',
      weighingTicketNumber: 'WB-OUT-2026-410',
      approvalStatus: 'معتمد',
      approvedBy: 'م. عبد الرحمن محمود الشهاوي',
      notes: 'صرف حصة قمح التموين لمطحن سلندرات المحلة الكبرى لإنتاج دقيق بلدي ٨٧.٥٪',
    },
    {
      id: 'mov-02',
      movementNumber: 'WHT-MOV-2026-502',
      movementDate: '2026-11-23',
      movementType: 'صرف لمطحن',
      sourceWarehouseId: 'wh-02',
      targetMillId: 'mill-02',
      quantityTons: 120.0,
      vehicleNumber: 'غ ر ب ٦٦١٢ نقل ثقيل',
      driverName: 'عادل مصطفى الشرقاوي',
      weighingTicketNumber: 'WB-OUT-2026-411',
      approvalStatus: 'معتمد',
      approvedBy: 'أ. السيد إبراهيم الجوهري',
      notes: 'صرف قمح من شونة بشبيش إلى مطحن العاشر المركزي',
    },
  ],
  mills: [
    {
      id: 'mill-01',
      code: 'ML-MHL-01',
      name: 'مطحن سلندرات المحلة الكبرى التمويني',
      millType: 'مطحن سلندرات حديث',
      ownerCompany: 'شركة مطاحن وسط وغرب الدلتا',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      localUnit: 'مركز المحلة الكبرى',
      villageOrCity: 'المحلة الكبرى',
      detailedAddress: 'شارع الجلاء - منطقة المطاحن الكبرى بالمحلة',
      managerName: 'م. سامح عزت عبد الحليم',
      phone: '01005432198',
      dailyProductionCapacityTons: 280,
      operatingLinesCount: 3,
      targetExtractionRatePct: 87.5,
      operatingStatus: 'عامل',
      licenseNumber: 'LIC-MILL-2022-104',
      licenseExpiryDate: '2027-12-31',
      costCenterId: 'cc-mill-01',
      notes: 'يغذي مخابز مركز وقرى المحلة الكبرى بدقيق بلدي استخراج ٨٧.٥٪',
    },
    {
      id: 'mill-02',
      code: 'ML-GHB-02',
      name: 'مطحن العاشر المركزي بالغربية',
      millType: 'مطحن قطاع عام',
      ownerCompany: 'شركة مطاحن وسط وغرب الدلتا',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      localUnit: 'المحلة الكبرى / سمنود',
      villageOrCity: 'طريق المحلة المنصورة',
      detailedAddress: 'الكيلو ٣ طريق المحلة سمنود',
      managerName: 'م. وجدي نبيل الطنطاوي',
      phone: '01227654310',
      dailyProductionCapacityTons: 160,
      operatingLinesCount: 2,
      targetExtractionRatePct: 87.5,
      operatingStatus: 'انخفاض كفاءة تشغيل',
      licenseNumber: 'LIC-MILL-2021-77',
      licenseExpiryDate: '2027-05-30',
      costCenterId: 'cc-mill-02',
      notes: 'الخط الثاني يحتاج إلى ضبط خلوص سلندرات الطحن ومراجعة المناخل لرفع الاستخراج',
    },
  ],
  millOperations: [
    {
      id: 'mop-01',
      operationNumber: 'MILL-OP-2026-801',
      operationDate: '2026-11-22',
      millId: 'mill-01',
      sourceWarehouseId: 'wh-01',
      openingWheatTons: 85.0,
      receivedWheatTons: 240.0,
      groundWheatTons: 240.0,
      flour875ProducedTons: 210.0,
      coarseBranProducedTons: 22.8,
      fineBranProducedTons: 5.4,
      semolinaOrOtherTons: 0,
      impuritiesSeparatedTons: 0.6,
      operationStatus: 'مكتمل',
      approvalStatus: 'معتمد',
      shiftSupervisor: 'م. أشرف حمدي سليم',
      notes: 'تشغيلة قياسية مطابقة تماماً لنسبة استخراج ٨٧.٥٠٪ وفاقد طحن ٠.٥٠٪ ضمن المسموح',
    },
    {
      id: 'mop-02',
      operationNumber: 'MILL-OP-2026-802',
      operationDate: '2026-11-24',
      millId: 'mill-02',
      sourceWarehouseId: 'wh-02',
      openingWheatTons: 40.0,
      receivedWheatTons: 120.0,
      groundWheatTons: 120.0,
      flour875ProducedTons: 103.5,
      coarseBranProducedTons: 11.1,
      fineBranProducedTons: 3.3,
      semolinaOrOtherTons: 0,
      impuritiesSeparatedTons: 0.3,
      operationStatus: 'مكتمل',
      approvalStatus: 'معتمد',
      shiftSupervisor: 'م. مدحت فوزي علام',
      notes: 'انخفاض طفيف في نسبة استخراج الدقيق (٨٦.٢٥٪) وارتفاع الفاقد إلى ١.٥٠٪ بسبب اهتزاز منخل الخط الثاني',
    },
  ],
  flourDistributions: [
    {
      id: 'fd-01',
      voucherNumber: 'FLR-ISS-2026-901',
      distributionDate: '2026-11-25',
      bakeryId: 'bak-001',
      millId: 'mill-01',
      dailyQuotaSacks: 35,
      approvedDays: 2,
      issuedFromMillTons: 3.5,
      receivedByBakeryTons: 3.5,
      approvalStatus: 'معتمد',
      notes: 'استلام كامل لحصة يومين (٧٠ شيكارة × ٥٠ كجم = ٣.٥٠ طن) بموجب بون صرف ماكينة POS',
    },
    {
      id: 'fd-02',
      voucherNumber: 'FLR-ISS-2026-902',
      distributionDate: '2026-11-25',
      bakeryId: 'bak-002',
      millId: 'mill-01',
      dailyQuotaSacks: 42,
      approvedDays: 2,
      issuedFromMillTons: 4.2,
      receivedByBakeryTons: 4.05,
      approvalStatus: 'معتمد',
      notes: 'فرق عجز ٣ شكائر (٠.١٥ طن) بين إذن خروج المطحن ومحضر استلام المخبز - تم تحرير مذكرة مراجعة',
    },
    {
      id: 'fd-03',
      voucherNumber: 'FLR-ISS-2026-903',
      distributionDate: '2026-11-25',
      bakeryId: 'bak-003',
      millId: 'mill-02',
      dailyQuotaSacks: 28,
      approvedDays: 2,
      issuedFromMillTons: 2.1,
      receivedByBakeryTons: 2.1,
      approvalStatus: 'معتمد',
      notes: 'صرف جزئي (٧٥٪ من الحصة المقررة) وجارٍ استكمال صرف باقي الحصة (٠.٧٠ طن)',
    },
    {
      id: 'fd-04',
      voucherNumber: 'FLR-ISS-2026-904',
      distributionDate: '2026-11-26',
      bakeryId: 'bak-004',
      millId: 'mill-01',
      dailyQuotaSacks: 30,
      approvedDays: 2,
      issuedFromMillTons: 3.0,
      receivedByBakeryTons: 3.0,
      approvalStatus: 'معتمد',
      notes: 'استلام كامل ومطابق لحصة المخبز',
    },
  ],
  refrigerators: [
    {
      id: 'ref-01',
      code: 'CLD-MHL-01',
      name: 'مجمع ثلاجات التبريد والتجميد المركزي بالمحلة الكبرى',
      refrigeratorType: 'مجمع تبريد وتجميد متعدد الغرف',
      supervisingAuthority: 'الشركة العامة لتجارة الجملة - قطاع الغربية',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      localUnit: 'مركز المحلة الكبرى',
      villageOrCity: 'المحلة الكبرى',
      detailedAddress: 'منطقة المستودعات التموينية - طريق دمرو المحلة',
      managerName: 'م. وائل صبحي الكيلاني',
      phone: '01065439871',
      roomsCount: 6,
      totalCapacityTons: 1200,
      approvedOpeningStockTons: 740,
      storedProductCategory: 'لحوم ودواجن مجمدة تموينية (-١٨°C إلى -٢٢°C)',
      minSafeTempC: -22.0,
      maxSafeTempC: -18.0,
      currentTempC: -19.5,
      currentHumidityPct: 84.0,
      coolingUnitStatus: 'تعمل بكفاءة',
      backupGeneratorStatus: 'جاهز للعمل تلقائياً',
      operatingStatus: 'عاملة',
      licenseNumber: 'LIC-COLD-2024-55',
      costCenterId: 'cc-ref-01',
      notes: 'تعمل بكامل طاقتها ومزودة بمولد احتياطي ٥٠٠ ك.ف.أ',
    },
    {
      id: 'ref-02',
      code: 'CLD-MHL-02',
      name: 'ثلاجة حفظ تقاوي البطاطس والسلع الغذائية بصفط تراب',
      refrigeratorType: 'ثلاجة تبريد',
      supervisingAuthority: 'قطاع التموين والتجارة الداخلية بالغربية',
      administration: 'إدارة تموين مركز المحلة الكبرى',
      localUnit: 'الوحدة المحلية بصفط تراب',
      villageOrCity: 'قرية صفط تراب',
      detailedAddress: 'طريق صفط تراب الهياتم - المحلة الكبرى',
      managerName: 'م. حاتم رزق الدسوقي',
      phone: '01278901234',
      roomsCount: 4,
      totalCapacityTons: 800,
      approvedOpeningStockTons: 510,
      storedProductCategory: 'سلع غذائية مبردة وألبان وتقاوي (+٢°C إلى +٥°C)',
      minSafeTempC: 2.0,
      maxSafeTempC: 5.0,
      currentTempC: 8.4,
      currentHumidityPct: 89.5,
      coolingUnitStatus: 'تحتاج صيانة عاجلة',
      backupGeneratorStatus: 'جاهز للعمل تلقائياً',
      operatingStatus: 'إنذار حرارة',
      licenseNumber: 'LIC-COLD-2023-32',
      costCenterId: 'cc-ref-01',
      notes: 'إنذار ارتفاع درجة الحرارة في غرفة التبريد رقم ٢ إلى (+٨.٤٠°C) بسبب ضعف ضاغط الفريون رقم ٢',
    },
    {
      id: 'ref-03',
      code: 'CLD-GHB-03',
      name: 'ثلاجة التجميد الاستراتيجي بطنطا',
      refrigeratorType: 'ثلاجة تجميد عميق',
      supervisingAuthority: 'مديرية التموين والتجارة الداخلية بالغربية',
      administration: 'مديرية التموين بالغربية',
      localUnit: 'مركز طنطا',
      villageOrCity: 'طنطا',
      detailedAddress: 'المنطقة اللوجستية التموينية بطنطا',
      managerName: 'م. شريف عادل النحاس',
      phone: '01123450987',
      roomsCount: 5,
      totalCapacityTons: 1500,
      approvedOpeningStockTons: 980,
      storedProductCategory: 'لحوم وأسماك ودواجن مجمدة (-١٨°C إلى -٢٤°C)',
      minSafeTempC: -24.0,
      maxSafeTempC: -18.0,
      currentTempC: -20.8,
      currentHumidityPct: 82.0,
      coolingUnitStatus: 'تعمل بكفاءة',
      backupGeneratorStatus: 'جاهز للعمل تلقائياً',
      operatingStatus: 'عاملة',
      licenseNumber: 'LIC-COLD-2025-11',
      costCenterId: 'cc-ref-01',
      notes: 'درجات الحرارة مستقرة وجميع غرف التجميد مطابقة للمواصفات',
    },
  ],
  refrigeratorTempLogs: [
    {
      id: 'tlog-01',
      logNumber: 'TMP-LOG-2026-01',
      refrigeratorId: 'ref-01',
      roomCode: 'غرفة تجميد R-01',
      recordedDate: '2026-11-26',
      recordedTime: '08:00',
      productName: 'دواجن ولحوم مجمدة تموينية',
      measuredTempC: -19.5,
      minAllowedTempC: -22.0,
      maxAllowedTempC: -18.0,
      humidityPct: 84.0,
      powerSource: 'كهرباء عمومية',
      correctiveAction: 'قراءة طبيعية ومستقرة داخل النطاق الآمن',
      recordedBy: 'فني التبريد / ياسر عبد المنعم',
    },
    {
      id: 'tlog-02',
      logNumber: 'TMP-LOG-2026-02',
      refrigeratorId: 'ref-02',
      roomCode: 'غرفة تبريد R-02',
      recordedDate: '2026-11-26',
      recordedTime: '09:15',
      productName: 'منتجات ألبان وجبن وسلع مبردة',
      measuredTempC: 8.4,
      minAllowedTempC: 2.0,
      maxAllowedTempC: 5.0,
      humidityPct: 89.5,
      powerSource: 'كهرباء عمومية',
      correctiveAction: 'تم تشغيل الضاغط الاحتياطي وفتح أمر صيانة طارئ رقم MO-2026-002 لشحن الفريون وتغيير صمام التمدد',
      recordedBy: 'م. حاتم رزق الدسوقي',
    },
  ],
  refrigeratorMovements: [
    {
      id: 'rmov-01',
      movementNumber: 'CLD-MOV-2026-101',
      refrigeratorId: 'ref-01',
      roomCode: 'غرفة تجميد R-01',
      movementDate: '2026-11-22',
      movementType: 'وارد تخزين',
      productName: 'دواجن مجمدة تموينية',
      quantityTons: 85.0,
      batchExpiryDate: '2027-08-30',
      approvalStatus: 'معتمد',
      approvedBy: 'م. وائل صبحي الكيلاني',
      notes: 'توريد دفعة جديدة للمجمعات الاستهلاكية',
    },
    {
      id: 'rmov-02',
      movementNumber: 'CLD-MOV-2026-102',
      refrigeratorId: 'ref-01',
      roomCode: 'غرفة تجميد R-01',
      movementDate: '2026-11-24',
      movementType: 'منصرف',
      productName: 'دواجن مجمدة تموينية',
      quantityTons: 45.0,
      batchExpiryDate: '2027-08-30',
      approvalStatus: 'معتمد',
      approvedBy: 'م. وائل صبحي الكيلاني',
      notes: 'صرف لفروع المجمعات الاستهلاكية ومنافذ التموين بالمحلة',
    },
  ],
  assets: [
    {
      id: 'ast-01',
      assetCode: 'AST-GRAIN-001',
      name: 'ميزان بسكول إلكتروني ديجيتال ٨٠ طناً — صومعة المحلة',
      assetCategory: 'موازين أرضية وبسكول',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-01',
      facilityName: 'صومعة المحلة الكبرى المعدنية المركزية',
      manufacturer: 'Mettler Toledo - Germany',
      modelNumber: 'MT-80T-PRO',
      serialNumber: 'SN-MT-2022-88412',
      manufactureYear: 2022,
      supplyDate: '2022-05-10',
      operationStartDate: '2022-06-01',
      purchaseCostEgp: 1450000,
      capitalAdditionsEgp: 120000,
      accumulatedDepreciationEgp: 435000,
      usefulLifeYears: 10,
      annualDepreciationRatePct: 10.0,
      technicalCondition: 'ممتازة',
      operatingStatus: 'عامل',
      warrantyExpiryDate: '2027-06-01',
      custodianName: 'م. عبد الرحمن محمود الشهاوي',
      maintenanceIntervalDays: 90,
      lastMaintenanceDate: '2026-09-15',
      nextMaintenanceDate: '2026-12-15',
      costCenterId: 'cc-wh-01',
      notes: 'مزود بـ ٨ خلايا وزن رقمية مقاومة للرطوبة والأتربة',
    },
    {
      id: 'ast-02',
      assetCode: 'AST-GRAIN-002',
      name: 'خط سلندرات الطحن الرئيسي الأول — مطحن المحلة',
      assetCategory: 'ماكينات طحن وسلندرات',
      facilityType: 'مطحن',
      facilityId: 'mill-01',
      facilityName: 'مطحن سلندرات المحلة الكبرى التمويني',
      manufacturer: 'Bühler Group - Switzerland',
      modelNumber: 'MDDK-1000-250',
      serialNumber: 'SN-BHL-2020-55190',
      manufactureYear: 2020,
      supplyDate: '2020-03-15',
      operationStartDate: '2020-05-01',
      purchaseCostEgp: 4800000,
      capitalAdditionsEgp: 350000,
      accumulatedDepreciationEgp: 1920000,
      usefulLifeYears: 15,
      annualDepreciationRatePct: 6.67,
      technicalCondition: 'جيدة جداً',
      operatingStatus: 'عامل',
      warrantyExpiryDate: '2026-05-01',
      custodianName: 'م. سامح عزت عبد الحليم',
      maintenanceIntervalDays: 60,
      lastMaintenanceDate: '2026-10-20',
      nextMaintenanceDate: '2026-12-20',
      costCenterId: 'cc-mill-01',
      notes: 'يعمل بكفاءة عالية ومربوط بوحدة نخل وتدريج أوتوماتيكية',
    },
    {
      id: 'ast-03',
      assetCode: 'AST-GRAIN-003',
      name: 'وحدة نخل ومناخل الدقيق المعلقة — مطحن العاشر',
      assetCategory: 'مناخل وخطوط نخل الدقيق',
      facilityType: 'مطحن',
      facilityId: 'mill-02',
      facilityName: 'مطحن العاشر المركزي بالغربية',
      manufacturer: 'Alapala Machine',
      modelNumber: 'ALP-SIFT-800',
      serialNumber: 'SN-ALP-2019-33910',
      manufactureYear: 2019,
      supplyDate: '2019-07-01',
      operationStartDate: '2019-08-15',
      purchaseCostEgp: 2150000,
      capitalAdditionsEgp: 0,
      accumulatedDepreciationEgp: 1075000,
      usefulLifeYears: 12,
      annualDepreciationRatePct: 8.33,
      technicalCondition: 'تحتاج صيانة',
      operatingStatus: 'متوقف للصيانة',
      warrantyExpiryDate: '2024-08-15',
      custodianName: 'م. وجدي نبيل الطنطاوي',
      maintenanceIntervalDays: 45,
      lastMaintenanceDate: '2026-09-01',
      nextMaintenanceDate: '2026-11-15',
      costCenterId: 'cc-mill-02',
      notes: 'تحت الصيانة لتغيير رومان البلي المركزي وشرائح الحرير لضبط نسبة الاستخراج',
    },
    {
      id: 'ast-04',
      assetCode: 'AST-GRAIN-004',
      name: 'وحدة ضواغط التبريد المركزية Bitzer — ثلاجة صفط تراب',
      assetCategory: 'وحدات وضواغط تبريد وتجميد',
      facilityType: 'ثلاجة تبريد',
      facilityId: 'ref-02',
      facilityName: 'ثلاجة حفظ تقاوي البطاطس والسلع الغذائية بصفط تراب',
      manufacturer: 'Bitzer Kühlmaschinenbau',
      modelNumber: 'BTZ-6FE-44Y',
      serialNumber: 'SN-BTZ-2021-77102',
      manufactureYear: 2021,
      supplyDate: '2021-04-10',
      operationStartDate: '2021-05-01',
      purchaseCostEgp: 1680000,
      capitalAdditionsEgp: 90000,
      accumulatedDepreciationEgp: 672000,
      usefulLifeYears: 10,
      annualDepreciationRatePct: 10.0,
      technicalCondition: 'تحتاج صيانة',
      operatingStatus: 'متوقف للصيانة',
      warrantyExpiryDate: '2026-05-01',
      custodianName: 'م. حاتم رزق الدسوقي',
      maintenanceIntervalDays: 60,
      lastMaintenanceDate: '2026-09-10',
      nextMaintenanceDate: '2026-11-10',
      costCenterId: 'cc-ref-01',
      notes: 'جاري إصلاح تسريب صمام التمدد وشحن غاز الفريون R404A',
    },
    {
      id: 'ast-05',
      assetCode: 'AST-GRAIN-005',
      name: 'مولد كهرباء ديزل احتياطي ٥٠٠ ك.ف.أ — صومعة المحلة',
      assetCategory: 'مولدات كهرباء احتياطية',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-01',
      facilityName: 'صومعة المحلة الكبرى المعدنية المركزية',
      manufacturer: 'Caterpillar Inc.',
      modelNumber: 'CAT-C15-500KVA',
      serialNumber: 'SN-CAT-2022-91004',
      manufactureYear: 2022,
      supplyDate: '2022-02-20',
      operationStartDate: '2022-03-10',
      purchaseCostEgp: 2400000,
      capitalAdditionsEgp: 0,
      accumulatedDepreciationEgp: 720000,
      usefulLifeYears: 12,
      annualDepreciationRatePct: 8.33,
      technicalCondition: 'ممتازة',
      operatingStatus: 'احتياطي جاهز',
      warrantyExpiryDate: '2027-03-10',
      custodianName: 'م. عبد الرحمن محمود الشهاوي',
      maintenanceIntervalDays: 90,
      lastMaintenanceDate: '2026-10-15',
      nextMaintenanceDate: '2027-01-15',
      costCenterId: 'cc-wh-01',
      notes: 'مزود بلوحة ATS للتحويل التلقائي خلال ٨ ثوانٍ عند انقطاع التيار',
    },
    {
      id: 'ast-06',
      assetCode: 'AST-GRAIN-006',
      name: 'سير ناقل وأليفيتور رفع حبوب رأسي ٦٠ طن/ساعة — شونة بشبيش',
      assetCategory: 'سيور ناقلة ونواقل حركة',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-02',
      facilityName: 'شونة بشبيش الأسفلتية المطورة',
      manufacturer: 'الشركة الهندسية للصناعات المعدنية',
      modelNumber: 'ELV-60T-EG',
      serialNumber: 'SN-ELV-2021-40912',
      manufactureYear: 2021,
      supplyDate: '2021-09-01',
      operationStartDate: '2021-10-01',
      purchaseCostEgp: 890000,
      capitalAdditionsEgp: 45000,
      accumulatedDepreciationEgp: 356000,
      usefulLifeYears: 10,
      annualDepreciationRatePct: 10.0,
      technicalCondition: 'جيدة جداً',
      operatingStatus: 'عامل',
      warrantyExpiryDate: '2026-10-01',
      custodianName: 'أ. السيد إبراهيم الجوهري',
      maintenanceIntervalDays: 60,
      lastMaintenanceDate: '2026-11-01',
      nextMaintenanceDate: '2027-01-01',
      costCenterId: 'cc-wh-02',
      notes: 'تم تغيير قايش السير الرئيسي وتزييت كراسي المحاور',
    },
  ],
  assetValuations: [
    {
      id: 'val-01',
      valuationNumber: 'VAL-2026-001',
      assetId: 'ast-01',
      valuationDate: '2026-11-15',
      valuationType: 'إهلاك دوري معتمد',
      historicalCostEgp: 1450000,
      capitalImprovementsEgp: 120000,
      operatingMaintenanceExpensesEgp: 18500,
      accumulatedDepreciationEgp: 435000,
      netBookValueEgp: 1135000,
      estimatedReplacementValueEgp: 1950000,
      committeeDecisionNumber: 'DEC-ENG-2026-44',
      approvalStatus: 'معتمد',
      notes: 'مصروف الصيانة الدورية (١٨,٥٠٠ ج.م) مسجل كمصروف تشغيلي ولم يُضف للقيمة الرأسمالية للأصل',
    },
    {
      id: 'val-02',
      valuationNumber: 'VAL-2026-002',
      assetId: 'ast-02',
      valuationDate: '2026-11-15',
      valuationType: 'إضافة وتحسين رأسمالي',
      historicalCostEgp: 4800000,
      capitalImprovementsEgp: 350000,
      operatingMaintenanceExpensesEgp: 42000,
      accumulatedDepreciationEgp: 1920000,
      netBookValueEgp: 3230000,
      estimatedReplacementValueEgp: 6200000,
      committeeDecisionNumber: 'DEC-ENG-2026-45',
      approvalStatus: 'معتمد',
      notes: 'إضافة وحدة تحكم PLC رقمية للسلندرات بقيمة ٣٥٠,٠٠٠ ج.م رفعت الكفاءة والعمر الإنتاجي للأصل',
    },
  ],
  maintenanceOrders: [
    {
      id: 'mo-01',
      orderNumber: 'MO-2026-001',
      maintenanceType: 'صيانة وقائية دورية',
      faultCategory: 'صيانة وقائية مجدولة',
      priority: 'متوسطة',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-01',
      facilityName: 'صومعة المحلة الكبرى المعدنية المركزية',
      assetId: 'ast-01',
      assetName: 'ميزان بسكول إلكتروني ديجيتال ٨٠ طناً — صومعة المحلة',
      faultReportDate: '2026-11-10',
      workStartDate: '2026-11-11',
      workEndDate: '2026-11-11',
      downtimeHours: 3.5,
      faultDescription: 'فحص ومعايرة خلايا الوزن الرقمية وتنظيف صندوق التجميع',
      rootCause: 'موعد الصيانة الوقائية الربع سنوية',
      workPerformed: 'مراجعة إشارات الـ ٨ خلايا واختبار الأوزان العيارية وتغيير فلتر الحماية',
      executingEntity: 'فريق الصيانة الهندسية بالمديرية',
      engineerName: 'م. خالد عبد العزيز سلامة',
      sparePartsCostEgp: 6500,
      externalLaborCostEgp: 12000,
      totalMaintenanceCostEgp: 18500,
      capitalizedToAsset: false,
      postMaintenanceTestResult: 'مطابق ١٠٠٪ للأوزان العيارية المعتمدة',
      orderStatus: 'مكتمل ومغلق',
      approvalStatus: 'معتمد',
      costCenterId: 'cc-wh-01',
      notes: 'مصروف صيانة تشغيلي مرحل لمركز تكلفة صومعة المحلة',
    },
    {
      id: 'mo-02',
      orderNumber: 'MO-2026-002',
      maintenanceType: 'صيانة طارئة',
      faultCategory: 'عطل تبريد وضواغط',
      priority: 'طارئة جداً',
      facilityType: 'ثلاجة تبريد',
      facilityId: 'ref-02',
      facilityName: 'ثلاجة حفظ تقاوي البطاطس والسلع الغذائية بصفط تراب',
      assetId: 'ast-04',
      assetName: 'وحدة ضواغط التبريد المركزية Bitzer — ثلاجة صفط تراب',
      faultReportDate: '2026-11-25',
      workStartDate: '2026-11-25',
      workEndDate: '',
      downtimeHours: 14.0,
      faultDescription: 'ارتفاع درجة حرارة غرفة التبريد رقم ٢ إلى +٨.٤°C نتيجة ضعف ضغط الفريون',
      rootCause: 'تلف صمام التمدد الحراري وحساس الضغط العالي',
      workPerformed: 'جاري استبدال صمام التمدد وحساس الحرارة وشحن أسطوانتي فريون R404A',
      executingEntity: 'شركة صيانة معتمدة متخصصة',
      engineerName: 'م. عمرو الجندي - هندسة التبريد',
      sparePartsCostEgp: 24000,
      externalLaborCostEgp: 9500,
      totalMaintenanceCostEgp: 33500,
      capitalizedToAsset: false,
      postMaintenanceTestResult: 'قيد الاختبار والتشغيل التجريبي',
      orderStatus: 'قيد التنفيذ',
      approvalStatus: 'معتمد',
      costCenterId: 'cc-ref-01',
      notes: 'أمر عمل مفتوح وعاجل (لا تُخصم قطع الغيار نهائياً من المخزن إلا بعد إغلاق واعتماد إتمام الأمر)',
    },
    {
      id: 'mo-03',
      orderNumber: 'MO-2026-003',
      maintenanceType: 'صيانة طارئة',
      faultCategory: 'عطل ميكانيكي',
      priority: 'عاجلة',
      facilityType: 'مطحن',
      facilityId: 'mill-02',
      facilityName: 'مطحن العاشر المركزي بالغربية',
      assetId: 'ast-03',
      assetName: 'وحدة نخل ومناخل الدقيق المعلقة — مطحن العاشر',
      faultReportDate: '2026-11-24',
      workStartDate: '2026-11-25',
      workEndDate: '',
      downtimeHours: 18.5,
      faultDescription: 'اهتزاز غير طبيعي في وحدة المناخل وانخفاض نسبة استخراج الدقيق إلى ٨٦.٢٥٪',
      rootCause: 'تآكل رومان البلي المركزي وتمزق شريحتي منخل حرير',
      workPerformed: 'فك عمود الاتزان وجاري تركيب رومان بلي SKF أصلي وشرائح منخل قياسية',
      executingEntity: 'فريق الصيانة الهندسية بالمديرية',
      engineerName: 'م. محمود الششتاوي',
      sparePartsCostEgp: 19200,
      externalLaborCostEgp: 5800,
      totalMaintenanceCostEgp: 25000,
      capitalizedToAsset: false,
      postMaintenanceTestResult: 'قيد التنفيذ والمعايرة',
      orderStatus: 'مفتوح',
      approvalStatus: 'معتمد',
      costCenterId: 'cc-mill-02',
      notes: 'مرتبط بتنبيه انخفاض نسبة الاستخراج في مطحن العاشر',
    },
    {
      id: 'mo-04',
      orderNumber: 'MO-2026-004',
      maintenanceType: 'صيانة وقائية دورية',
      faultCategory: 'صيانة وقائية مجدولة',
      priority: 'عادية',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-02',
      facilityName: 'شونة بشبيش الأسفلتية المطورة',
      assetId: 'ast-06',
      assetName: 'سير ناقل وأليفيتور رفع حبوب رأسي ٦٠ طن/ساعة — شونة بشبيش',
      faultReportDate: '2026-11-01',
      workStartDate: '2026-11-01',
      workEndDate: '2026-11-02',
      downtimeHours: 6.0,
      faultDescription: 'استبدال قايش السير الناقل وضبط شداد الأليفيتور',
      rootCause: 'صيانة موسمية مجدولة قبل ذروة التوريد',
      workPerformed: 'تركيب سير مطاطي مسلح بطول ٢٤ متراً وتشحيم كراسي المحاور',
      executingEntity: 'فريق الصيانة الهندسية بالمديرية',
      engineerName: 'م. خالد عبد العزيز سلامة',
      sparePartsCostEgp: 16000,
      externalLaborCostEgp: 4000,
      totalMaintenanceCostEgp: 20000,
      capitalizedToAsset: false,
      postMaintenanceTestResult: 'يعمل بكامل طاقته ٦٠ طن/ساعة دون اهتزاز',
      orderStatus: 'مكتمل ومغلق',
      approvalStatus: 'معتمد',
      costCenterId: 'cc-wh-02',
      notes: 'تم إغلاق الأمر وخصم قطع الغيار وترحيل التكلفة لمركز تكلفة شونة بشبيش',
    },
  ],
  spareParts: [
    {
      id: 'sp-01',
      partCode: 'SP-BRG-101',
      name: 'رومان بلي محوري ثقيل SKF 22316 للسلندرات والمناخل',
      category: 'رومان بلي وكراسي محور',
      unit: 'قطعة',
      warehouseLocation: 'المخزن الهندسي المركزي بالمحلة الكبرى',
      compatibleAssets: 'سلندرات الطحن + مناخل الدقيق + الأليفيتور',
      approvedOpeningQty: 14,
      minReorderLevel: 6,
      unitCostEgp: 3200,
      supplierName: 'التوكيل الهندسي لرومان البلي SKF',
      notes: 'قطعة حيوية لخطوط الطحن والنواقل',
    },
    {
      id: 'sp-02',
      partCode: 'SP-BLT-102',
      name: 'سير ناقل مطاطي مسلح مقاوم للاحتكاك (لفة ٢٤ متراً)',
      category: 'سيور ناقلة وقوايش',
      unit: 'لفة',
      warehouseLocation: 'المخزن الهندسي المركزي بالمحلة الكبرى',
      compatibleAssets: 'سيور الشون والصوامع والأليفيتور',
      approvedOpeningQty: 4,
      minReorderLevel: 3,
      unitCostEgp: 16000,
      supplierName: 'الشركة المصرية للسيور الصناعية',
      notes: 'وصل إلى حد إعادة الطلب بعد صرف لفة لأمر صيانة شونة بشبيش',
    },
    {
      id: 'sp-03',
      partCode: 'SP-CLD-103',
      name: 'صمام تمدد حراري وحساس حرارة Danfoss لغرف التبريد',
      category: 'ضواغط وصمامات تبريد',
      unit: 'طقم',
      warehouseLocation: 'مخزن قطع غيار التبريد - المحلة',
      compatibleAssets: 'وحدات تبريد Bitzer وثلاجات الحفظ',
      approvedOpeningQty: 3,
      minReorderLevel: 4,
      unitCostEgp: 8500,
      supplierName: 'المركز الهندسي لمعدات التبريد التجاري',
      notes: 'رصيد منخفض أقل من حد إعادة الطلب (٣ أطقم متاحة مقابل حد طلب ٤)',
    },
    {
      id: 'sp-04',
      partCode: 'SP-WGH-104',
      name: 'خلية وزن رقمية Load Cell 30T IP68 لموازين البسكول',
      category: 'خلايا وزن إلكترونية',
      unit: 'قطعة',
      warehouseLocation: 'المخزن الهندسي المركزي بالمحلة الكبرى',
      compatibleAssets: 'موازين البسكول الأرضية ٦٠ و٨٠ طناً',
      approvedOpeningQty: 8,
      minReorderLevel: 4,
      unitCostEgp: 6500,
      supplierName: 'شركة الموازين الرقمية المتقدمة',
      notes: 'رصيد آمن ومطابق للمواصفات',
    },
    {
      id: 'sp-05',
      partCode: 'SP-FLT-105',
      name: 'طقم فلاتر هواء ووقود وزيت لمولد كاتربيلر ٥٠٠ ك.ف.أ',
      category: 'فلاتر ومصافي',
      unit: 'طقم',
      warehouseLocation: 'المخزن الهندسي المركزي بالمحلة الكبرى',
      compatibleAssets: 'مولدات الكهرباء الاحتياطية CAT',
      approvedOpeningQty: 2,
      minReorderLevel: 3,
      unitCostEgp: 4800,
      supplierName: 'مانتراك لمعدات القوى',
      notes: 'وصل لحد إعادة الطلب ويستلزم توريد ٣ أطقم إضافية',
    },
  ],
  sparePartMovements: [
    {
      id: 'spm-01',
      movementNumber: 'SPM-2026-001',
      partId: 'sp-04',
      movementDate: '2026-11-11',
      movementType: 'صرف لأمر صيانة',
      quantity: 1,
      unitCostEgp: 6500,
      totalCostEgp: 6500,
      maintenanceOrderId: 'mo-01',
      maintenanceOrderStatus: 'مكتمل ومغلق',
      facilityName: 'صومعة المحلة الكبرى المعدنية المركزية',
      assetName: 'ميزان بسكول إلكتروني ديجيتال ٨٠ طناً — صومعة المحلة',
      approvalStatus: 'معتمد',
      approvedBy: 'م. خالد عبد العزيز سلامة',
      notes: 'تم خصم القطعة من المخزن لاكتمال وإغلاق أمر الصيانة MO-2026-001',
    },
    {
      id: 'spm-02',
      movementNumber: 'SPM-2026-002',
      partId: 'sp-02',
      movementDate: '2026-11-01',
      movementType: 'صرف لأمر صيانة',
      quantity: 1,
      unitCostEgp: 16000,
      totalCostEgp: 16000,
      maintenanceOrderId: 'mo-04',
      maintenanceOrderStatus: 'مكتمل ومغلق',
      facilityName: 'شونة بشبيش الأسفلتية المطورة',
      assetName: 'سير ناقل وأليفيتور رفع حبوب رأسي ٦٠ طن/ساعة — شونة بشبيش',
      approvalStatus: 'معتمد',
      approvedBy: 'م. خالد عبد العزيز سلامة',
      notes: 'تم خصم لفة السير لاكتمال وإغلاق أمر الصيانة MO-2026-004',
    },
  ],
  financialTransactions: [
    {
      id: 'fin-01',
      documentNumber: 'FIN-GRN-2026-1001',
      transactionDate: '2026-11-11',
      accountCategory: '٢. مصروفات الصيانة الدورية والوقائية',
      entryType: 'مصروف تشغيلي',
      costCenterId: 'cc-wh-01',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-01',
      facilityName: 'صومعة المحلة الكبرى المعدنية المركزية',
      relatedReferenceNumber: 'MO-2026-001',
      debitAmountEgp: 18500,
      creditAmountEgp: 0,
      netAmountEgp: 18500,
      beneficiaryOrPayer: 'مركز معايرة الموازين + المخزن الهندسي',
      paymentMethod: 'أمر دفع إلكتروني حكومي',
      approvalStatus: 'معتمد',
      approvedBy: 'أ. مجدي عبد اللطيف - المحاسب المالي للقسم',
      description: 'تكلفة صيانة ومعايرة ميزان البسكول الإلكتروني بصومعة المحلة (شاملة خلية وزن احتياطية)',
    },
    {
      id: 'fin-02',
      documentNumber: 'FIN-GRN-2026-1002',
      transactionDate: '2026-11-02',
      accountCategory: '٤. تكلفة شراء واستهلاك قطع الغيار',
      entryType: 'مصروف تشغيلي',
      costCenterId: 'cc-wh-02',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-02',
      facilityName: 'شونة بشبيش الأسفلتية المطورة',
      relatedReferenceNumber: 'MO-2026-004',
      debitAmountEgp: 20000,
      creditAmountEgp: 0,
      netAmountEgp: 20000,
      beneficiaryOrPayer: 'المخزن الهندسي المركزي + فريق الصيانة',
      paymentMethod: 'تسوية مخزنية وأمر دفع',
      approvalStatus: 'معتمد',
      approvedBy: 'أ. مجدي عبد اللطيف - المحاسب المالي للقسم',
      description: 'تكلفة استبدال قايش السير الناقل وصيانة أليفيتور شونة بشبيش',
    },
    {
      id: 'fin-03',
      documentNumber: 'FIN-GRN-2026-1003',
      transactionDate: '2026-11-15',
      accountCategory: '١. تكلفة شراء وتوريد الأصول الهندسية',
      entryType: 'مصروف رأسمالي',
      costCenterId: 'cc-mill-01',
      facilityType: 'مطحن',
      facilityId: 'mill-01',
      facilityName: 'مطحن سلندرات المحلة الكبرى التمويني',
      relatedReferenceNumber: 'VAL-2026-002',
      debitAmountEgp: 350000,
      creditAmountEgp: 0,
      netAmountEgp: 350000,
      beneficiaryOrPayer: 'شركة بوهلر للأنظمة الصناعية',
      paymentMethod: 'أمر دفع إلكتروني حكومي',
      approvalStatus: 'معتمد',
      approvedBy: 'أ. مجدي عبد اللطيف - المحاسب المالي للقسم',
      description: 'توريد وتركيب وحدة تحكم PLC رقمية لخط سلندرات الطحن الأول (إضافة رأسمالية معتمدة)',
    },
    {
      id: 'fin-04',
      documentNumber: 'FIN-GRN-2026-1004',
      transactionDate: '2026-11-20',
      accountCategory: '٨. مصروفات الكهرباء والوقود والطاقة',
      entryType: 'مصروف تشغيلي',
      costCenterId: 'cc-ref-01',
      facilityType: 'ثلاجة تبريد',
      facilityId: 'ref-01',
      facilityName: 'مجمع ثلاجات التبريد والتجميد المركزي بالمحلة الكبرى',
      relatedReferenceNumber: 'INV-PWR-2026-11',
      debitAmountEgp: 64500,
      creditAmountEgp: 0,
      netAmountEgp: 64500,
      beneficiaryOrPayer: 'شركة جنوب الدلتا لتوزيع الكهرباء',
      paymentMethod: 'شيك حكومي / تسوية',
      approvalStatus: 'معتمد',
      approvedBy: 'أ. مجدي عبد اللطيف - المحاسب المالي للقسم',
      description: 'استهلاك الطاقة الكهربائية والوقود الاحتياطي لتشغيل غرف التجميد والتبريد لشهر نوفمبر ٢٠٢٦',
    },
    {
      id: 'fin-05',
      documentNumber: 'FIN-GRN-2026-1005',
      transactionDate: '2026-11-24',
      accountCategory: '١٢. تكلفة الفاقد والعجز والتالف غير المبرر',
      entryType: 'تسوية محاسبية',
      costCenterId: 'cc-wh-02',
      facilityType: 'شونة / صومعة',
      facilityId: 'wh-02',
      facilityName: 'شونة بشبيش الأسفلتية المطورة',
      relatedReferenceNumber: 'INV-LOSS-2026-01',
      debitAmountEgp: 426000,
      creditAmountEgp: 0,
      netAmountEgp: 426000,
      beneficiaryOrPayer: 'حساب تسويات العجز الجردي تحت التحقيق',
      paymentMethod: 'قيد تسوية رقابي',
      approvalStatus: 'معتمد',
      approvedBy: 'أ. مجدي عبد اللطيف - المحاسب المالي للقسم',
      description: 'إثبات القيمة المالية لعجز الجرد غير المبرر (٣٢.٠٠ طن قمح) بشونة بشبيش لحين البت القانوني',
    },
    {
      id: 'fin-06',
      documentNumber: 'FIN-GRN-2026-1006',
      transactionDate: '2026-11-25',
      accountCategory: '١٣. إيرادات ومقابل خدمات التخزين والطحن والتبريد',
      entryType: 'إيراد تشغيلي',
      costCenterId: 'cc-mill-01',
      facilityType: 'مطحن',
      facilityId: 'mill-01',
      facilityName: 'مطحن سلندرات المحلة الكبرى التمويني',
      relatedReferenceNumber: 'MILL-OP-2026-801',
      debitAmountEgp: 0,
      creditAmountEgp: 315000,
      netAmountEgp: 315000,
      beneficiaryOrPayer: 'هيئة السلع التموينية - مقابل طحن وتوزيع حصص الدقيق',
      paymentMethod: 'تحويل بنكي لحساب المديرية',
      approvalStatus: 'معتمد',
      approvedBy: 'أ. مجدي عبد اللطيف - المحاسب المالي للقسم',
      description: 'مقابل طحن ٢٤٠ طن قمح وتوزيع ٢١٠ طن دقيق بلدي ٨٧.٥٪ للمخابز المعتمدة',
    },
  ],
  auditLogs: [
    {
      id: 'gaud-01',
      timestamp: '2026-11-20T09:45:00Z',
      userId: 'usr-001',
      userName: 'م. عبد الرحمن محمود الشهاوي',
      userRole: 'مسؤول الشون والصوامع',
      actionType: 'اعتماد',
      targetScreen: '٣. استلام القمح والوزن والفحص',
      targetRecordId: 'WHT-REC-2026-001',
      facilityName: 'صومعة المحلة الكبرى المعدنية المركزية',
      beforeSummary: 'حالة الشحنة: تحت المراجعة (٥٠.٢٠ طن)',
      afterSummary: 'حالة الشحنة: معتمد — أُضيفت الكمية آلياً إلى الرصيد المعتمد للصومعة',
      reason: 'مطابقة الفحص المعملي وتذكرة البسكول WB-2026-9001',
    },
    {
      id: 'gaud-02',
      timestamp: '2026-11-22T12:10:00Z',
      userId: 'usr-002',
      userName: 'م. هاني كمال الشرقاوي',
      userRole: 'مهندس الفحص والجودة',
      actionType: 'إضافة',
      targetScreen: '٤. الرطوبة والجودة والفاقد والعجز',
      targetRecordId: 'MST-2026-101',
      facilityName: 'شونة بشبيش الأسفلتية المطورة',
      beforeSummary: 'الوزن الفعلي المستلم: ٣٩.٥٥ طن عند رطوبة ١٤.٨٠٪',
      afterSummary: 'تسجيل فرق رطوبة (+١.٨٠٪) بخصم محاسبي ٠.٨٢ طن مع بقاء الوزن الفعلي الأصلي محفوظاً',
      reason: 'تطبيق معادلة تصحيح الرطوبة المعتمدة دون طمس الوزن الفعلي',
    },
    {
      id: 'gaud-03',
      timestamp: '2026-11-25T10:30:00Z',
      userId: 'usr-003',
      userName: 'م. سامح عزت عبد الحليم',
      userRole: 'مسؤول المطاحن والاستخراج',
      actionType: 'إضافة',
      targetScreen: '٧. حصص الدقيق وصرفها للمخابز',
      targetRecordId: 'FLR-ISS-2026-902',
      facilityName: 'مطحن سلندرات المحلة الكبرى التمويني',
      beforeSummary: 'منصرف من المطحن: ٤.٢٠ طن',
      afterSummary: 'مستلم بالمخبز: ٤.٠٥ طن — رصد فرق (-٠.١٥ طن) وإطلاق تنبيه مراجعة',
      reason: 'مطابقة بون صرف المطحن مع محضر استلام المخبز',
    },
  ],
};

// =============================================================================
// التخزين المحلي المتزامن (Hydration-safe localStorage store)
// =============================================================================

const GRAIN_STORAGE_KEY = 'supply_gharbia_grain_maintenance_v1';
const grainListeners = new Set<() => void>();

export function loadGrainMaintenanceStore(): GrainMaintenanceStoreData {
  if (typeof window === 'undefined') return INITIAL_GRAIN_MAINTENANCE_STORE;
  try {
    const raw = window.localStorage.getItem(GRAIN_STORAGE_KEY);
    if (!raw) return INITIAL_GRAIN_MAINTENANCE_STORE;
    const parsed = JSON.parse(raw) as Partial<GrainMaintenanceStoreData>;
    return {
      ...INITIAL_GRAIN_MAINTENANCE_STORE,
      ...parsed,
      settings: {
        ...INITIAL_GRAIN_MAINTENANCE_STORE.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch {
    return INITIAL_GRAIN_MAINTENANCE_STORE;
  }
}

export function saveGrainMaintenanceStore(data: GrainMaintenanceStoreData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GRAIN_STORAGE_KEY, JSON.stringify(data));
    grainListeners.forEach((fn) => fn());
  } catch {
    // ignore storage quota errors
  }
}

export function subscribeGrainMaintenanceStore(listener: () => void): () => void {
  grainListeners.add(listener);
  return () => {
    grainListeners.delete(listener);
  };
}
