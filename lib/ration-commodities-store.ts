/**
 * مخزن بيانات قسم السلع التموينية — مديرية التموين والتجارة الداخلية بالغربية
 * يغطي كافة الشاشات الـ ١٤:
 * ١- لوحة المؤشرات والرسوم البيانية
 * ٢- سجل السلع التموينية + سجل تاريخ الأسعار غير القابل للتعديل
 * ٣- سجل التجار التموينيين (٣٠ حقلاً كاملاً بما فيها التراخيص والبطاقة الضريبية والسجل التجاري وتواريخ الانتهاء) + سجل متابعة التاجر
 * ٤- إدارة الحصص التموينية (٢٠ حقلاً + المعادلات الدقيقة + تعديلات الحصص الموثقة)
 * ٥- إدارة المخازن والمشتريات (المخازن، المشتريات والتوريدات، دفتر الحركة برصيد آلي، التحويل بين المخازن، الجرد والمطابقة)
 * ٦- متابعة البطاقات التموينية (مع إخفاء جزئي للبيانات الحساسة)
 * ٧- قاعدة بيانات المستفيدين (إحصاءات القرى والوحدات + السجل التاريخي المستقل ٢٠٢٣ و٢٠٢٤ و٢٠٢٥ وإضافة سنوات جديدة)
 * ٨- سجل عمليات صرف المواطنين (مع منع تكرار الرقم المرجعي وتفصيل السلع)
 * ٩- الرقابة والمتابعة التموينية + مؤشرات أداء التاجر
 * ١٠- سجل الشكاوى التموينية
 * ١١- نظام التنبيهات الذكي
 * ١٢- مركز التقارير (٥٠ تقريراً رسمياً مصنفاً)
 * ١٣- الطباعة والتصدير الرسمي
 * ١٤- الإعدادات وسجل التدقيق
 */

export type RationCommodityStatus = 'نشط' | 'موقوف مؤقتاً' | 'غير متوفر' | 'ملغى';

export interface RationCommodityRecord {
  id: string;
  commodityCode: string;
  commodityName: string;
  category: string;
  unit: string;
  packWeightOrSize: string;
  officialSubsidizedPriceEgp: number;
  wholesalePriceEgp: number;
  merchantMarginEgp: number;
  officialFreePriceEgp: number;
  maxQuantityPerBeneficiary: number;
  maxQuantityPerCard: number;
  supplySource: string;
  storageNature: 'جاف' | 'مبرد' | 'حساس للرطوبة' | 'معلب';
  shelfLifeMonths: number;
  minSafetyStock: number;
  reorderLevel: number;
  status: RationCommodityStatus;
  notes: string;
}

export interface CommodityPriceHistoryRecord {
  id: string;
  commodityId: string;
  commodityCode: string;
  commodityName: string;
  previousPriceEgp: number;
  newPriceEgp: number;
  effectiveDate: string;
  priceSource: string;
  decreeNumber: string;
  updatedBy: string;
  approvalStatus: 'معتمد' | 'قيد المراجعة';
  recordedAt: string;
}

export type RationMerchantStatus =
  | 'نشط'
  | 'موقوف مؤقتاً'
  | 'تحت المراجعة'
  | 'مغلق'
  | 'منتهي الترخيص'
  | 'مخالف'
  | 'مسحوب الترخيص';

export interface RationMerchantRecord {
  id: string;
  merchantCode: string;
  fileNumber: string;
  merchantName: string;
  outletTradeName: string;
  outletType: 'بقال تمويني' | 'مشروع جمعيتي' | 'مجمع استهلاكي';
  nationalId: string;
  phoneNumber: string;
  mobileNumber: string;
  email: string;
  supplyAdministration: string;
  supplyOffice: string;
  localUnit: string;
  village: string;
  detailedAddress: string;
  gpsCoordinates: string;
  posMachineNumber: string;
  smartCardCode: string;
  wholesaleBranchName: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  taxCardNumber: string;
  taxCardExpiryDate: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiryDate: string;
  insuranceAmountEgp: number;
  linkedCardsCount: number;
  linkedBeneficiariesCount: number;
  monthlyApprovedQuotaValueEgp: number;
  status: RationMerchantStatus;
  notes: string;
}

export interface MerchantFollowupLogRecord {
  id: string;
  merchantId: string;
  merchantCode: string;
  merchantName: string;
  logDate: string;
  eventType: 'زيارة تفتيشية' | 'شكوى مواطن' | 'إنذار إداري' | 'إيقاف مؤقت' | 'تجديد مستندات';
  summary: string;
  recordedBy: string;
  status: 'مفتوح' | 'تمت المعالجة';
}

export type QuotaPeriodicity = 'يومي' | 'أسبوعي' | 'شهري' | 'ربع سنوي' | 'سنوي' | 'موسمي';

export interface RationQuotaRecord {
  id: string;
  quotaCode: string;
  periodLabel: string;
  periodicity: QuotaPeriodicity;
  startDate: string;
  endDate: string;
  supplyAdministration: string;
  village: string;
  localUnit: string;
  merchantId: string;
  merchantName: string;
  commodityId: string;
  commodityName: string;
  unit: string;
  originalApprovedQuota: number;
  amendedApprovedQuota: number;
  suppliedQuantity: number;
  dispensedQuantity: number;
  amendmentReason: string;
  amendmentDecreeNumber: string;
  status: 'مفتوحة للصرف' | 'مكتملة' | 'متأخرة التوريد' | 'معدلة بقرار';
  approvedBy: string;
}

export interface RationWarehouseRecord {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  supplyAdministration: string;
  village: string;
  localUnit: string;
  managerName: string;
  phone: string;
  capacityTons: number;
  currentOccupancyTons: number;
  licenseNumber: string;
  licenseExpiryDate: string;
  taxCardNumber: string;
  taxCardExpiryDate: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiryDate: string;
  status: 'نشط' | 'صيانة' | 'مغلق';
}

export interface WarehousePurchaseReceiptRecord {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  warehouseId: string;
  warehouseName: string;
  supplierName: string;
  commodityId: string;
  commodityName: string;
  unit: string;
  quantityReceived: number;
  unitCostEgp: number;
  totalValueEgp: number;
  batchNumber: string;
  expiryDate: string;
  approvalStatus: 'معتمد' | 'مسودة' | 'ملغى بقيد عكسي';
  recordedBy: string;
}

export interface WarehouseLedgerMovementRecord {
  id: string;
  movementNumber: string;
  movementDate: string;
  warehouseId: string;
  warehouseName: string;
  commodityId: string;
  commodityName: string;
  unit: string;
  openingBalance: number;
  incomingQty: number;
  transfersInQty: number;
  returnsQty: number;
  dispensedQty: number;
  transfersOutQty: number;
  damagedQty: number;
  adjustmentsQty: number;
  /** الرصيد الآلي المحسوب: الافتتاحي + الوارد + التحويلات الواردة + المرتجعات - المنصرف - التحويلات الصادرة - التالف - التسويات */
  computedClosingBalance: number;
  referenceDocNumber: string;
  approvalStatus: 'معتمد' | 'قيد عكسي';
  recordedBy: string;
}

export interface WarehouseTransferRecord {
  id: string;
  transferNumber: string;
  transferDate: string;
  fromWarehouseName: string;
  toWarehouseName: string;
  commodityName: string;
  unit: string;
  quantity: number;
  driverOrCarrier: string;
  approvalStatus: 'بانتظار الاعتماد' | 'معتمد ومستلم' | 'مرفوض';
  approvedBy: string;
}

export interface WarehouseStocktakeRecord {
  id: string;
  stocktakeNumber: string;
  stocktakeDate: string;
  warehouseName: string;
  commodityName: string;
  unit: string;
  bookBalance: number;
  actualPhysicalCount: number;
  /** الفرق = الفعلي - الدفتري */
  varianceQty: number;
  committeeChair: string;
  status: 'مطابق' | 'عجز يستوجب المساءلة' | 'زيادة دفتريه';
  notes: string;
}

export type RationCardStatus =
  | 'نشطة'
  | 'موقوفة مؤقتاً'
  | 'موقوفة لحين التحديث'
  | 'بدل فاقد/تالف'
  | 'محولة لإدارة أخرى'
  | 'ملغاة';

export interface RationCardRecord {
  id: string;
  cardNumber: string;
  headOfFamilyName: string;
  nationalId: string;
  phoneNumber: string;
  beneficiariesCount: number;
  cardType: 'سلع + خبز' | 'سلع فقط' | 'خبز فقط' | 'تكافل وكرامة';
  supplyAdministration: string;
  supplyOffice: string;
  village: string;
  localUnit: string;
  assignedMerchantName: string;
  monthlySupportValueEgp: number;
  lastIssueDate: string;
  status: RationCardStatus;
  notes: string;
}

export interface BeneficiaryYearlySnapshot {
  year: number;
  cardsCount: number;
  beneficiariesCount: number;
  monthlySupportValueEgp: number;
  dispensedSugarKg: number;
  dispensedOilBottles: number;
  dispensedOtherUnits: number;
}

export interface VillageBeneficiaryStatRecord {
  id: string;
  supplyAdministration: string;
  localUnit: string;
  village: string;
  merchantsCount: number;
  yearlySnapshots: BeneficiaryYearlySnapshot[];
}

export interface CitizenIssueTransactionRecord {
  id: string;
  referenceNumber: string;
  issueDate: string;
  cardNumber: string;
  headOfFamilyName: string;
  merchantCode: string;
  merchantName: string;
  village: string;
  sourceChannel: 'ماكينة POS الرسمية' | 'بوابة مصر الرقمية' | 'استيراد شهري مجمع';
  itemsSummary: string;
  totalSupportUsedEgp: number;
  cashDiffPaidEgp: number;
  status: 'تم الصرف' | 'ملغى بقيد عكسي' | 'مرفوض';
  auditNote: string;
}

export interface RationFieldInspectionRecord {
  id: string;
  inspectionNumber: string;
  inspectionDate: string;
  merchantCode: string;
  merchantName: string;
  village: string;
  inspectorName: string;
  pricesDeclared: 'نعم' | 'لا';
  stockMatchesBook: 'مطابق' | 'عجز' | 'زيادة';
  violationsFound: string;
  reportNumberIfAny: string;
  complianceScore: number;
  reviewRecommendation: string;
  status: 'تم الفحص والمطابقة' | 'محضر محرر' | 'قيد المراجعة';
}

export type RationComplaintStatus = 'جديدة' | 'قيد الفحص' | 'محالة' | 'تم الرد' | 'مغلقة';

export interface RationComplaintRecord {
  id: string;
  complaintNumber: string;
  complaintDate: string;
  citizenName: string;
  citizenPhone: string;
  village: string;
  targetMerchantName: string;
  subject: string;
  details: string;
  assignedInspector: string;
  status: RationComplaintStatus;
  resolutionReply: string;
}

export type RationAlertSeverity = 'معلوماتي' | 'منخفض' | 'متوسط' | 'مرتفع' | 'عاجل';

export interface RationSmartAlertRecord {
  id: string;
  alertCode: string;
  category:
    | 'تنبيهات السلع والمخزون'
    | 'تنبيهات التجار والتراخيص'
    | 'تنبيهات الحصص والتوريد'
    | 'تنبيهات البطاقات والصرف';
  title: string;
  entityName: string;
  village: string;
  severity: RationAlertSeverity;
  recommendedAction: string;
  createdAt: string;
  status: 'مفتوح' | 'تمت المعالجة';
}

export interface RationAuditLogRecord {
  id: string;
  timestamp: string;
  userName: string;
  screenName: string;
  actionType: 'إضافة' | 'تعديل' | 'حذف' | 'قيد عكسي' | 'اعتماد' | 'إعادة ضبط المصنع';
  details: string;
}

export interface RationDepartmentSettings {
  licenseWarningDays: number;
  lowStockBufferPercent: number;
  quotaDelayWarningPercent: number;
  maskSensitiveCardDataByDefault: boolean;
  commodityCategories: string[];
  defaultSupportPerPersonEgp: number;
}

export interface RationReportDefinition {
  id: string;
  num: number;
  group: string;
  title: string;
  orientation: 'portrait' | 'landscape';
}

// ==================== معادلات الحساب الدقيقة ====================
export function computeQuotaMetrics(q: RationQuotaRecord) {
  const effectiveApproved = q.amendedApprovedQuota > 0 ? q.amendedApprovedQuota : q.originalApprovedQuota;
  const remainingToDispense = Math.max(0, effectiveApproved - q.dispensedQuantity);
  const executionRatePct =
    effectiveApproved > 0 ? Number(((q.dispensedQuantity / effectiveApproved) * 100).toFixed(1)) : 0;
  const remainingToSupply = Math.max(0, effectiveApproved - q.suppliedQuantity);
  const supplyRatePct =
    effectiveApproved > 0 ? Number(((q.suppliedQuantity / effectiveApproved) * 100).toFixed(1)) : 0;

  return {
    effectiveApproved,
    remainingToDispense,
    executionRatePct,
    remainingToSupply,
    supplyRatePct,
  };
}

export function computeLedgerClosingBalance(m: {
  openingBalance: number;
  incomingQty: number;
  transfersInQty: number;
  returnsQty: number;
  dispensedQty: number;
  transfersOutQty: number;
  damagedQty: number;
  adjustmentsQty: number;
}): number {
  return Number(
    (
      m.openingBalance +
      m.incomingQty +
      m.transfersInQty +
      m.returnsQty -
      m.dispensedQty -
      m.transfersOutQty -
      m.damagedQty -
      m.adjustmentsQty
    ).toFixed(2)
  );
}

export function maskNationalIdOrCard(raw: string, showFull: boolean): string {
  if (showFull || !raw || raw.length < 6) return raw;
  return `${raw.slice(0, 3)}******${raw.slice(-3)}`;
}

// ==================== البيانات الأولية الواقعية لمركز المحلة الكبرى / الغربية ====================

export const INITIAL_RATION_COMMODITIES: RationCommodityRecord[] = [
  {
    id: 'rc-1',
    commodityCode: 'COM-SUG-01',
    commodityName: 'سكر معبأ تمويني ١ كجم',
    category: 'السكر والزيوت الأساسية',
    unit: 'كيس ١ كجم',
    packWeightOrSize: '١ كجم صافي',
    officialSubsidizedPriceEgp: 12.6,
    wholesalePriceEgp: 12.1,
    merchantMarginEgp: 0.5,
    officialFreePriceEgp: 35,
    maxQuantityPerBeneficiary: 1,
    maxQuantityPerCard: 6,
    supplySource: 'الشركة العامة لتجارة الجملة — فرع المحلة',
    storageNature: 'جاف',
    shelfLifeMonths: 24,
    minSafetyStock: 2500,
    reorderLevel: 5000,
    status: 'نشط',
    notes: 'السلعة الأساسية الأولى على البطاقة التموينية',
  },
  {
    id: 'rc-2',
    commodityCode: 'COM-OIL-02',
    commodityName: 'زيت خليط تمويني ٨٠٠ مللي',
    category: 'السكر والزيوت الأساسية',
    unit: 'زجاجة ٨٠٠ مللي',
    packWeightOrSize: '٨٠٠ مللي',
    officialSubsidizedPriceEgp: 30,
    wholesalePriceEgp: 29.25,
    merchantMarginEgp: 0.75,
    officialFreePriceEgp: 58,
    maxQuantityPerBeneficiary: 1,
    maxQuantityPerCard: 4,
    supplySource: 'الشركة القابضة للصناعات الغذائية',
    storageNature: 'معلب',
    shelfLifeMonths: 12,
    minSafetyStock: 2000,
    reorderLevel: 4200,
    status: 'نشط',
    notes: 'بحد أقصى ٤ زجاجات للبطاقة الواحدة',
  },
  {
    id: 'rc-3',
    commodityCode: 'COM-PAS-03',
    commodityName: 'مكرونة معبأة ٤٠٠ جم',
    category: 'الحبوب والمكرونة والدقيق',
    unit: 'كيس ٤٠٠ جم',
    packWeightOrSize: '٤٠٠ جم',
    officialSubsidizedPriceEgp: 8.5,
    wholesalePriceEgp: 8.0,
    merchantMarginEgp: 0.5,
    officialFreePriceEgp: 13,
    maxQuantityPerBeneficiary: 2,
    maxQuantityPerCard: 8,
    supplySource: 'الشركة العامة لتجارة الجملة',
    storageNature: 'جاف',
    shelfLifeMonths: 18,
    minSafetyStock: 1800,
    reorderLevel: 3500,
    status: 'نشط',
    notes: 'متوفرة بجميع منافذ جمعيتي والبقالين',
  },
  {
    id: 'rc-4',
    commodityCode: 'COM-FLR-04',
    commodityName: 'دقيق معبأ ورقي/بلاستيك ١ كجم',
    category: 'الحبوب والمكرونة والدقيق',
    unit: 'كيس ١ كجم',
    packWeightOrSize: '١ كجم',
    officialSubsidizedPriceEgp: 18,
    wholesalePriceEgp: 17.25,
    merchantMarginEgp: 0.75,
    officialFreePriceEgp: 26,
    maxQuantityPerBeneficiary: 1,
    maxQuantityPerCard: 5,
    supplySource: 'شركة مطاحن وسط وغرب الدلتا',
    storageNature: 'حساس للرطوبة',
    shelfLifeMonths: 6,
    minSafetyStock: 1200,
    reorderLevel: 2400,
    status: 'نشط',
    notes: 'يُحفظ على طبالي خشبية مرتفعة',
  },
  {
    id: 'rc-5',
    commodityCode: 'COM-CHE-05',
    commodityName: 'جبن أبيض تتراباك ٢٥٠ جم',
    category: 'الألبان والمعلبات',
    unit: 'عبوة ٢٥٠ جم',
    packWeightOrSize: '٢٥٠ جم',
    officialSubsidizedPriceEgp: 14,
    wholesalePriceEgp: 13.4,
    merchantMarginEgp: 0.6,
    officialFreePriceEgp: 21,
    maxQuantityPerBeneficiary: 2,
    maxQuantityPerCard: 6,
    supplySource: 'الشركة العامة لتجارة الجملة',
    storageNature: 'مبرد',
    shelfLifeMonths: 9,
    minSafetyStock: 900,
    reorderLevel: 1800,
    status: 'نشط',
    notes: 'يتطلب تخزيناً مبرداً بالمنافذ',
  },
  {
    id: 'rc-6',
    commodityCode: 'COM-DET-06',
    commodityName: 'مسحوق غسيل عادي/أتوماتيك ٨٠٠ جم',
    category: 'المنظفات والمستلزمات المنزلية',
    unit: 'كيس ٨٠٠ جم',
    packWeightOrSize: '٨٠٠ جم',
    officialSubsidizedPriceEgp: 16,
    wholesalePriceEgp: 15.25,
    merchantMarginEgp: 0.75,
    officialFreePriceEgp: 28,
    maxQuantityPerBeneficiary: 1,
    maxQuantityPerCard: 3,
    supplySource: 'الشركة القابضة للصناعات الغذائية',
    storageNature: 'جاف',
    shelfLifeMonths: 36,
    minSafetyStock: 800,
    reorderLevel: 1500,
    status: 'غير متوفر',
    notes: 'جاري استعاضة الرصيد من فرع الجملة بطنطا',
  },
];

export const INITIAL_PRICE_HISTORY: CommodityPriceHistoryRecord[] = [
  {
    id: 'ph-1',
    commodityId: 'rc-1',
    commodityCode: 'COM-SUG-01',
    commodityName: 'سكر معبأ تمويني ١ كجم',
    previousPriceEgp: 10.5,
    newPriceEgp: 12.6,
    effectiveDate: '2025-05-01',
    priceSource: 'قرار وزير التموين والتجارة الداخلية',
    decreeNumber: 'قرار وزاري ٦٨ لسنة ٢٠٢٥',
    updatedBy: 'م. أحمد الحسيني',
    approvalStatus: 'معتمد',
    recordedAt: '2025-04-29',
  },
  {
    id: 'ph-2',
    commodityId: 'rc-2',
    commodityCode: 'COM-OIL-02',
    commodityName: 'زيت خليط تمويني ٨٠٠ مللي',
    previousPriceEgp: 25,
    newPriceEgp: 30,
    effectiveDate: '2025-05-01',
    priceSource: 'قرار وزير التموين والتجارة الداخلية',
    decreeNumber: 'قرار وزاري ٦٨ لسنة ٢٠٢٥',
    updatedBy: 'م. أحمد الحسيني',
    approvalStatus: 'معتمد',
    recordedAt: '2025-04-29',
  },
  {
    id: 'ph-3',
    commodityId: 'rc-3',
    commodityCode: 'COM-PAS-03',
    commodityName: 'مكرونة معبأة ٤٠٠ جم',
    previousPriceEgp: 7.75,
    newPriceEgp: 8.5,
    effectiveDate: '2026-01-01',
    priceSource: 'منشور الشركة القابضة للصناعات الغذائية',
    decreeNumber: 'منشور دوري ١٢ لسنة ٢٠٢٦',
    updatedBy: 'أ. محمود الشريف',
    approvalStatus: 'معتمد',
    recordedAt: '2025-12-28',
  },
];

export const INITIAL_RATION_MERCHANTS: RationMerchantRecord[] = [
  {
    id: 'rm-1',
    merchantCode: 'MER-GH-001',
    fileNumber: 'FILE-2026-101',
    merchantName: 'محمود إبراهيم الششتاوي',
    outletTradeName: 'منفذ النور للسلع التموينية (جمعيتي)',
    outletType: 'مشروع جمعيتي',
    nationalId: '28105141602145',
    phoneNumber: '0402234110',
    mobileNumber: '01005541298',
    email: 'noor.ration@gharbia.gov.eg',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    supplyOffice: 'مكتب تموين صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    village: 'صفط تراب',
    detailedAddress: 'شارع الجمعية الزراعية — بجوار الوحدة الصحية',
    gpsCoordinates: '30.9412, 31.1824',
    posMachineNumber: 'POS-991042',
    smartCardCode: 'SC-44102',
    wholesaleBranchName: 'فرع الجملة بالمحلة الكبرى ١',
    licenseNumber: 'RAT-LIC-8801',
    licenseExpiryDate: '2027-08-15',
    taxCardNumber: '601-442-819',
    taxCardExpiryDate: '2028-04-10',
    commercialRegisterNumber: 'CR-88512',
    commercialRegisterExpiryDate: '2028-01-20',
    insuranceAmountEgp: 75000,
    linkedCardsCount: 1240,
    linkedBeneficiariesCount: 4820,
    monthlyApprovedQuotaValueEgp: 241000,
    status: 'نشط',
    notes: 'ملتزم بالإعلان عن الأسعار وصرف الاستعاضات في مواعيدها',
  },
  {
    id: 'rm-2',
    merchantCode: 'MER-GH-002',
    fileNumber: 'FILE-2026-102',
    merchantName: 'السيد عبد الحميد الجزار',
    outletTradeName: 'بقالة الأمل التموينية المعتمدة',
    outletType: 'بقال تمويني',
    nationalId: '27508191604411',
    phoneNumber: '0402278901',
    mobileNumber: '01223490112',
    email: 'amal.gazar@gharbia.gov.eg',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    supplyOffice: 'مكتب تموين محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    village: 'محلة أبو علي',
    detailedAddress: 'شارع داير الناحية — أمام المسجد الكبير',
    gpsCoordinates: '30.9854, 31.1981',
    posMachineNumber: 'POS-991088',
    smartCardCode: 'SC-44188',
    wholesaleBranchName: 'فرع الجملة بالمحلة الكبرى ٢',
    licenseNumber: 'RAT-LIC-8845',
    licenseExpiryDate: '2026-10-01',
    taxCardNumber: '519-882-330',
    taxCardExpiryDate: '2026-12-10',
    commercialRegisterNumber: 'CR-77401',
    commercialRegisterExpiryDate: '2027-09-30',
    insuranceAmountEgp: 60000,
    linkedCardsCount: 980,
    linkedBeneficiariesCount: 3910,
    monthlyApprovedQuotaValueEgp: 195500,
    status: 'منتهي الترخيص',
    notes: 'تم إنذاره بسرعة تجديد ترخيص التشغيل والبطاقة الضريبية',
  },
  {
    id: 'rm-3',
    merchantCode: 'MER-GH-003',
    fileNumber: 'FILE-2026-103',
    merchantName: 'هناء محمد عبد العال',
    outletTradeName: 'منفذ الخير جمعيتي بالهياتم',
    outletType: 'مشروع جمعيتي',
    nationalId: '29011201601189',
    phoneNumber: '0402411290',
    mobileNumber: '01119044321',
    email: 'khair.hayatem@gharbia.gov.eg',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    supplyOffice: 'مكتب تموين الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    village: 'الهياتم',
    detailedAddress: 'الطريق الرئيسي — مدخل قرية الهياتم',
    gpsCoordinates: '30.9122, 31.1045',
    posMachineNumber: 'POS-991109',
    smartCardCode: 'SC-44209',
    wholesaleBranchName: 'فرع الجملة بالمحلة الكبرى ١',
    licenseNumber: 'RAT-LIC-8912',
    licenseExpiryDate: '2028-03-15',
    taxCardNumber: '712-901-225',
    taxCardExpiryDate: '2028-06-30',
    commercialRegisterNumber: 'CR-90144',
    commercialRegisterExpiryDate: '2029-01-15',
    insuranceAmountEgp: 85000,
    linkedCardsCount: 1410,
    linkedBeneficiariesCount: 5540,
    monthlyApprovedQuotaValueEgp: 277000,
    status: 'نشط',
    notes: 'أعلى معدل التزام وتنفيذ لحصص القرية',
  },
  {
    id: 'rm-4',
    merchantCode: 'MER-GH-004',
    fileNumber: 'FILE-2026-104',
    merchantName: 'الشركة العامة لتجارة الجملة — مجمع دمرو',
    outletTradeName: 'المجمع الاستهلاكي الحكومي بدمرو',
    outletType: 'مجمع استهلاكي',
    nationalId: '26901011600012',
    phoneNumber: '0402551200',
    mobileNumber: '01099812345',
    email: 'damro.coop@gharbia.gov.eg',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    supplyOffice: 'مكتب تموين دمرو',
    localUnit: 'الوحدة المحلية بدمرو',
    village: 'دمرو',
    detailedAddress: 'ميدان الوحدة المحلية — دمرو',
    gpsCoordinates: '31.0114, 31.1642',
    posMachineNumber: 'POS-991201',
    smartCardCode: 'SC-44301',
    wholesaleBranchName: 'فرع الجملة الرئيسي بالغربية',
    licenseNumber: 'RAT-LIC-9001',
    licenseExpiryDate: '2029-12-31',
    taxCardNumber: '100-200-300',
    taxCardExpiryDate: '2029-12-31',
    commercialRegisterNumber: 'CR-10045',
    commercialRegisterExpiryDate: '2029-12-31',
    insuranceAmountEgp: 150000,
    linkedCardsCount: 1850,
    linkedBeneficiariesCount: 7210,
    monthlyApprovedQuotaValueEgp: 360500,
    status: 'نشط',
    notes: 'مجمع استهلاكي حكومي يخدم دمرو والقرى المجاورة',
  },
];

export const INITIAL_MERCHANT_FOLLOWUPS: MerchantFollowupLogRecord[] = [
  {
    id: 'mfl-1',
    merchantId: 'rm-2',
    merchantCode: 'MER-GH-002',
    merchantName: 'السيد عبد الحميد الجزار',
    logDate: '2026-11-18',
    eventType: 'إنذار إداري',
    summary: 'تم تسليم إنذار كتابي بسرعة تجديد رخصة التشغيل المنتهية خلال ١٥ يوماً.',
    recordedBy: 'مفتش أول / طارق النجار',
    status: 'مفتوح',
  },
  {
    id: 'mfl-2',
    merchantId: 'rm-1',
    merchantCode: 'MER-GH-001',
    merchantName: 'محمود إبراهيم الششتاوي',
    logDate: '2026-11-20',
    eventType: 'زيارة تفتيشية',
    summary: 'الرصيد الدفتري مطابق للفعلي مع توافر السكر والزيت والمكرونة بالأسعار الرسمية.',
    recordedBy: 'مفتش أول / هيثم الجندي',
    status: 'تمت المعالجة',
  },
];

export const INITIAL_RATION_QUOTAS: RationQuotaRecord[] = [
  {
    id: 'rq-1',
    quotaCode: 'QTA-2026-11-01',
    periodLabel: 'نوفمبر ٢٠٢٦',
    periodicity: 'شهري',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    merchantId: 'rm-1',
    merchantName: 'محمود إبراهيم الششتاوي',
    commodityId: 'rc-1',
    commodityName: 'سكر معبأ تمويني ١ كجم',
    unit: 'كيس ١ كجم',
    originalApprovedQuota: 5000,
    amendedApprovedQuota: 5400,
    suppliedQuantity: 5400,
    dispensedQuantity: 4860,
    amendmentReason: 'استعاضة إضافية لمواجهة إقبال المواطنين بصفط تراب',
    amendmentDecreeNumber: 'موافقة مدير الإدارة رقم ٤١٢/٢٠٢٦',
    status: 'معدلة بقرار',
    approvedBy: 'مدير إدارة التموين',
  },
  {
    id: 'rq-2',
    quotaCode: 'QTA-2026-11-02',
    periodLabel: 'نوفمبر ٢٠٢٦',
    periodicity: 'شهري',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    merchantId: 'rm-2',
    merchantName: 'السيد عبد الحميد الجزار',
    commodityId: 'rc-2',
    commodityName: 'زيت خليط تمويني ٨٠٠ مللي',
    unit: 'زجاجة ٨٠٠ مللي',
    originalApprovedQuota: 3800,
    amendedApprovedQuota: 3800,
    suppliedQuantity: 2500,
    dispensedQuantity: 2350,
    amendmentReason: '—',
    amendmentDecreeNumber: '—',
    status: 'متأخرة التوريد',
    approvedBy: 'مدير إدارة التموين',
  },
  {
    id: 'rq-3',
    quotaCode: 'QTA-2026-11-03',
    periodLabel: 'نوفمبر ٢٠٢٦',
    periodicity: 'شهري',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    merchantId: 'rm-3',
    merchantName: 'هناء محمد عبد العال',
    commodityId: 'rc-1',
    commodityName: 'سكر معبأ تمويني ١ كجم',
    unit: 'كيس ١ كجم',
    originalApprovedQuota: 5600,
    amendedApprovedQuota: 5600,
    suppliedQuantity: 5600,
    dispensedQuantity: 5600,
    amendmentReason: '—',
    amendmentDecreeNumber: '—',
    status: 'مكتملة',
    approvedBy: 'مدير إدارة التموين',
  },
  {
    id: 'rq-4',
    quotaCode: 'QTA-2026-11-04',
    periodLabel: 'نوفمبر ٢٠٢٦',
    periodicity: 'شهري',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'دمرو',
    localUnit: 'الوحدة المحلية بدمرو',
    merchantId: 'rm-4',
    merchantName: 'الشركة العامة لتجارة الجملة — مجمع دمرو',
    commodityId: 'rc-3',
    commodityName: 'مكرونة معبأة ٤٠٠ جم',
    unit: 'كيس ٤٠٠ جم',
    originalApprovedQuota: 6200,
    amendedApprovedQuota: 6200,
    suppliedQuantity: 5800,
    dispensedQuantity: 4950,
    amendmentReason: '—',
    amendmentDecreeNumber: '—',
    status: 'مفتوحة للصرف',
    approvedBy: 'مدير إدارة التموين',
  },
];

export const INITIAL_RATION_WAREHOUSES: RationWarehouseRecord[] = [
  {
    id: 'rw-1',
    warehouseCode: 'WH-RAT-01',
    warehouseName: 'مخزن الجملة الرئيسي — طريق المحلة / طنطا',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    managerName: 'أ. عبد السلام محمود الدسوقي',
    phone: '01001122334',
    capacityTons: 1200,
    currentOccupancyTons: 890,
    licenseNumber: 'WH-LIC-2026-01',
    licenseExpiryDate: '2028-09-30',
    taxCardNumber: '204-551-990',
    taxCardExpiryDate: '2028-12-31',
    commercialRegisterNumber: 'CR-44100',
    commercialRegisterExpiryDate: '2029-05-15',
    status: 'نشط',
  },
  {
    id: 'rw-2',
    warehouseCode: 'WH-RAT-02',
    warehouseName: 'مخزن توزيع قطاع شمال المحلة (دمرو)',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'دمرو',
    localUnit: 'الوحدة المحلية بدمرو',
    managerName: 'أ. خالد علي الفقي',
    phone: '01227788990',
    capacityTons: 650,
    currentOccupancyTons: 410,
    licenseNumber: 'WH-LIC-2026-02',
    licenseExpiryDate: '2027-01-10',
    taxCardNumber: '204-551-991',
    taxCardExpiryDate: '2028-12-31',
    commercialRegisterNumber: 'CR-44101',
    commercialRegisterExpiryDate: '2029-05-15',
    status: 'نشط',
  },
];

export const INITIAL_WAREHOUSE_RECEIPTS: WarehousePurchaseReceiptRecord[] = [
  {
    id: 'wpr-1',
    receiptNumber: 'REC-2026-901',
    receiptDate: '2026-11-18',
    warehouseId: 'rw-1',
    warehouseName: 'مخزن الجملة الرئيسي — طريق المحلة / طنطا',
    supplierName: 'شركة الدلتا للسكر (الحامول)',
    commodityId: 'rc-1',
    commodityName: 'سكر معبأ تمويني ١ كجم',
    unit: 'كيس ١ كجم',
    quantityReceived: 15000,
    unitCostEgp: 12.1,
    totalValueEgp: 181500,
    batchNumber: 'BCH-SUG-1126',
    expiryDate: '2028-11-01',
    approvalStatus: 'معتمد',
    recordedBy: 'أمين مخزن الجملة',
  },
  {
    id: 'wpr-2',
    receiptNumber: 'REC-2026-902',
    receiptDate: '2026-11-21',
    warehouseId: 'rw-2',
    warehouseName: 'مخزن توزيع قطاع شمال المحلة (دمرو)',
    supplierName: 'شركة طنطا للزيوت والصابون',
    commodityId: 'rc-2',
    commodityName: 'زيت خليط تمويني ٨٠٠ مللي',
    unit: 'زجاجة ٨٠٠ مللي',
    quantityReceived: 8000,
    unitCostEgp: 29.25,
    totalValueEgp: 234000,
    batchNumber: 'BCH-OIL-1126',
    expiryDate: '2027-11-01',
    approvalStatus: 'معتمد',
    recordedBy: 'أمين مخزن دمرو',
  },
];

export const INITIAL_WAREHOUSE_LEDGER: WarehouseLedgerMovementRecord[] = [
  {
    id: 'wlm-1',
    movementNumber: 'MOV-2026-501',
    movementDate: '2026-11-24',
    warehouseId: 'rw-1',
    warehouseName: 'مخزن الجملة الرئيسي — طريق المحلة / طنطا',
    commodityId: 'rc-1',
    commodityName: 'سكر معبأ تمويني ١ كجم',
    unit: 'كيس ١ كجم',
    openingBalance: 6000,
    incomingQty: 15000,
    transfersInQty: 0,
    returnsQty: 120,
    dispensedQty: 12400,
    transfersOutQty: 1500,
    damagedQty: 20,
    adjustmentsQty: 0,
    computedClosingBalance: 7200,
    referenceDocNumber: 'REC-2026-901 / إذن صرف ٤١٠',
    approvalStatus: 'معتمد',
    recordedBy: 'مراقب حركة المخازن',
  },
  {
    id: 'wlm-2',
    movementNumber: 'MOV-2026-502',
    movementDate: '2026-11-24',
    warehouseId: 'rw-2',
    warehouseName: 'مخزن توزيع قطاع شمال المحلة (دمرو)',
    commodityId: 'rc-2',
    commodityName: 'زيت خليط تمويني ٨٠٠ مللي',
    unit: 'زجاجة ٨٠٠ مللي',
    openingBalance: 2400,
    incomingQty: 8000,
    transfersInQty: 500,
    returnsQty: 0,
    dispensedQty: 9100,
    transfersOutQty: 0,
    damagedQty: 10,
    adjustmentsQty: 0,
    computedClosingBalance: 1790,
    referenceDocNumber: 'REC-2026-902 / إذن صرف ٤١٢',
    approvalStatus: 'معتمد',
    recordedBy: 'أمين مخزن دمرو',
  },
];

export const INITIAL_WAREHOUSE_TRANSFERS: WarehouseTransferRecord[] = [
  {
    id: 'wt-1',
    transferNumber: 'TRF-2026-301',
    transferDate: '2026-11-22',
    fromWarehouseName: 'مخزن الجملة الرئيسي — طريق المحلة / طنطا',
    toWarehouseName: 'مخزن توزيع قطاع شمال المحلة (دمرو)',
    commodityName: 'سكر معبأ تمويني ١ كجم',
    unit: 'كيس ١ كجم',
    quantity: 1500,
    driverOrCarrier: 'سيارة نقل رقم (غ ر ب ٤٨١٢)',
    approvalStatus: 'معتمد ومستلم',
    approvedBy: 'مدير إدارة التموين',
  },
  {
    id: 'wt-2',
    transferNumber: 'TRF-2026-302',
    transferDate: '2026-11-25',
    fromWarehouseName: 'مخزن الجملة الرئيسي — طريق المحلة / طنطا',
    toWarehouseName: 'مخزن توزيع قطاع شمال المحلة (دمرو)',
    commodityName: 'زيت خليط تمويني ٨٠٠ مللي',
    unit: 'زجاجة ٨٠٠ مللي',
    quantity: 1200,
    driverOrCarrier: 'سيارة نقل رقم (غ ر ب ٩١٢٠)',
    approvalStatus: 'بانتظار الاعتماد',
    approvedBy: '—',
  },
];

export const INITIAL_WAREHOUSE_STOCKTAKES: WarehouseStocktakeRecord[] = [
  {
    id: 'ws-1',
    stocktakeNumber: 'STK-2026-11-01',
    stocktakeDate: '2026-11-24',
    warehouseName: 'مخزن الجملة الرئيسي — طريق المحلة / طنطا',
    commodityName: 'سكر معبأ تمويني ١ كجم',
    unit: 'كيس ١ كجم',
    bookBalance: 7200,
    actualPhysicalCount: 7200,
    varianceQty: 0,
    committeeChair: 'لجنة الجرد الدورية برئاسة أ. محمد سالم',
    status: 'مطابق',
    notes: 'الجرد الفعلي مطابق تماماً لدفتر الحركة',
  },
  {
    id: 'ws-2',
    stocktakeNumber: 'STK-2026-11-02',
    stocktakeDate: '2026-11-24',
    warehouseName: 'مخزن توزيع قطاع شمال المحلة (دمرو)',
    commodityName: 'زيت خليط تمويني ٨٠٠ مللي',
    unit: 'زجاجة ٨٠٠ مللي',
    bookBalance: 1790,
    actualPhysicalCount: 1765,
    varianceQty: -25,
    committeeChair: 'لجنة الجرد المفاجئ برئاسة أ. طارق النجار',
    status: 'عجز يستوجب المساءلة',
    notes: 'عجز ٢٥ زجاجة — تم تحرير مذكرة فحص ومطابقة أذون الصرف',
  },
];

export const INITIAL_RATION_CARDS: RationCardRecord[] = [
  {
    id: 'card-1',
    cardNumber: '116044892104',
    headOfFamilyName: 'أحمد محمد عبد الفتاح القاضي',
    nationalId: '28406151601124',
    phoneNumber: '01009912441',
    beneficiariesCount: 4,
    cardType: 'سلع + خبز',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    supplyOffice: 'مكتب تموين صفط تراب',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    assignedMerchantName: 'محمود إبراهيم الششتاوي',
    monthlySupportValueEgp: 200,
    lastIssueDate: '2026-11-12',
    status: 'نشطة',
    notes: 'صرف منتظم شهرياً',
  },
  {
    id: 'card-2',
    cardNumber: '116044892288',
    headOfFamilyName: 'فاطمة السيد حسنين الشرقاوي',
    nationalId: '27903211603318',
    phoneNumber: '01228841200',
    beneficiariesCount: 3,
    cardType: 'تكافل وكرامة',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    supplyOffice: 'مكتب تموين محلة أبو علي',
    village: 'محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    assignedMerchantName: 'السيد عبد الحميد الجزار',
    monthlySupportValueEgp: 150,
    lastIssueDate: '2026-11-08',
    status: 'نشطة',
    notes: 'بطاقة أولى بالرعاية',
  },
  {
    id: 'card-3',
    cardNumber: '116044893511',
    headOfFamilyName: 'إبراهيم عبد العزيز طه',
    nationalId: '27110111605542',
    phoneNumber: '01114567890',
    beneficiariesCount: 5,
    cardType: 'سلع + خبز',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    supplyOffice: 'مكتب تموين الهياتم',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    assignedMerchantName: 'هناء محمد عبد العال',
    monthlySupportValueEgp: 225,
    lastIssueDate: '2026-10-19',
    status: 'موقوفة لحين التحديث',
    notes: 'مطلوب تحديث رقم المحمول المسجل بقاعدة البيانات',
  },
  {
    id: 'card-4',
    cardNumber: '116044894009',
    headOfFamilyName: 'سمير عبد الرؤوف غنيم',
    nationalId: '26804121602287',
    phoneNumber: '01066778891',
    beneficiariesCount: 2,
    cardType: 'سلع + خبز',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    supplyOffice: 'مكتب تموين دمرو',
    village: 'دمرو',
    localUnit: 'الوحدة المحلية بدمرو',
    assignedMerchantName: 'الشركة العامة لتجارة الجملة — مجمع دمرو',
    monthlySupportValueEgp: 100,
    lastIssueDate: '2026-11-15',
    status: 'بدل فاقد/تالف',
    notes: 'تم تقديم طلب استخراج بدل تالف للشريحة الذكية',
  },
];

export const INITIAL_VILLAGE_BENEFICIARY_STATS: VillageBeneficiaryStatRecord[] = [
  {
    id: 'vbs-1',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    localUnit: 'الوحدة المحلية بصفط تراب',
    village: 'صفط تراب',
    merchantsCount: 8,
    yearlySnapshots: [
      { year: 2023, cardsCount: 6120, beneficiariesCount: 24180, monthlySupportValueEgp: 1209000, dispensedSugarKg: 289000, dispensedOilBottles: 241000, dispensedOtherUnits: 145000 },
      { year: 2024, cardsCount: 6250, beneficiariesCount: 24510, monthlySupportValueEgp: 1225500, dispensedSugarKg: 294120, dispensedOilBottles: 245000, dispensedOtherUnits: 152000 },
      { year: 2025, cardsCount: 6390, beneficiariesCount: 24890, monthlySupportValueEgp: 1244500, dispensedSugarKg: 298680, dispensedOilBottles: 249200, dispensedOtherUnits: 161400 },
    ],
  },
  {
    id: 'vbs-2',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    village: 'محلة أبو علي',
    merchantsCount: 7,
    yearlySnapshots: [
      { year: 2023, cardsCount: 5410, beneficiariesCount: 21200, monthlySupportValueEgp: 1060000, dispensedSugarKg: 254000, dispensedOilBottles: 211000, dispensedOtherUnits: 128000 },
      { year: 2024, cardsCount: 5520, beneficiariesCount: 21580, monthlySupportValueEgp: 1079000, dispensedSugarKg: 258900, dispensedOilBottles: 216500, dispensedOtherUnits: 134500 },
      { year: 2025, cardsCount: 5640, beneficiariesCount: 21950, monthlySupportValueEgp: 1097500, dispensedSugarKg: 263400, dispensedOilBottles: 220100, dispensedOtherUnits: 140800 },
    ],
  },
  {
    id: 'vbs-3',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    localUnit: 'الوحدة المحلية بالهياتم',
    village: 'الهياتم',
    merchantsCount: 9,
    yearlySnapshots: [
      { year: 2023, cardsCount: 6840, beneficiariesCount: 26900, monthlySupportValueEgp: 1345000, dispensedSugarKg: 322800, dispensedOilBottles: 268000, dispensedOtherUnits: 169000 },
      { year: 2024, cardsCount: 6990, beneficiariesCount: 27320, monthlySupportValueEgp: 1366000, dispensedSugarKg: 327840, dispensedOilBottles: 272500, dispensedOtherUnits: 175200 },
      { year: 2025, cardsCount: 7110, beneficiariesCount: 27780, monthlySupportValueEgp: 1389000, dispensedSugarKg: 333360, dispensedOilBottles: 278100, dispensedOtherUnits: 183600 },
    ],
  },
  {
    id: 'vbs-4',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    localUnit: 'الوحدة المحلية بدمرو',
    village: 'دمرو',
    merchantsCount: 6,
    yearlySnapshots: [
      { year: 2023, cardsCount: 4720, beneficiariesCount: 18450, monthlySupportValueEgp: 922500, dispensedSugarKg: 221400, dispensedOilBottles: 184000, dispensedOtherUnits: 112000 },
      { year: 2024, cardsCount: 4810, beneficiariesCount: 18820, monthlySupportValueEgp: 941000, dispensedSugarKg: 225840, dispensedOilBottles: 188200, dispensedOtherUnits: 117500 },
      { year: 2025, cardsCount: 4930, beneficiariesCount: 19240, monthlySupportValueEgp: 962000, dispensedSugarKg: 230880, dispensedOilBottles: 192800, dispensedOtherUnits: 124900 },
    ],
  },
];

export const INITIAL_CITIZEN_ISSUES: CitizenIssueTransactionRecord[] = [
  {
    id: 'cit-1',
    referenceNumber: 'TXN-POS-20261112-001',
    issueDate: '2026-11-12',
    cardNumber: '116044892104',
    headOfFamilyName: 'أحمد محمد عبد الفتاح القاضي',
    merchantCode: 'MER-GH-001',
    merchantName: 'محمود إبراهيم الششتاوي',
    village: 'صفط تراب',
    sourceChannel: 'ماكينة POS الرسمية',
    itemsSummary: '٤ سكر تمويني + ٤ زيت ٨٠٠ مللي + ٣ مكرونة',
    totalSupportUsedEgp: 195.9,
    cashDiffPaidEgp: 4.1,
    status: 'تم الصرف',
    auditNote: 'صرف معتمد بإيصال ماكينة POS',
  },
  {
    id: 'cit-2',
    referenceNumber: 'TXN-POS-20261108-002',
    issueDate: '2026-11-08',
    cardNumber: '116044892288',
    headOfFamilyName: 'فاطمة السيد حسنين الشرقاوي',
    merchantCode: 'MER-GH-002',
    merchantName: 'السيد عبد الحميد الجزار',
    village: 'محلة أبو علي',
    sourceChannel: 'ماكينة POS الرسمية',
    itemsSummary: '٣ سكر تمويني + ٣ زيت ٨٠٠ مللي + ٢ جبن',
    totalSupportUsedEgp: 155.8,
    cashDiffPaidEgp: 5.8,
    status: 'تم الصرف',
    auditNote: 'تم الصرف بالكامل',
  },
  {
    id: 'cit-3',
    referenceNumber: 'TXN-POS-20261115-003',
    issueDate: '2026-11-15',
    cardNumber: '116044894009',
    headOfFamilyName: 'سمير عبد الرؤوف غنيم',
    merchantCode: 'MER-GH-004',
    merchantName: 'الشركة العامة لتجارة الجملة — مجمع دمرو',
    village: 'دمرو',
    sourceChannel: 'استيراد شهري مجمع',
    itemsSummary: '٢ سكر تمويني + ٢ زيت ٨٠٠ مللي + ١ دقيق',
    totalSupportUsedEgp: 103.2,
    cashDiffPaidEgp: 3.2,
    status: 'تم الصرف',
    auditNote: 'مطابق مع تسوية الجملة',
  },
];

export const INITIAL_RATION_INSPECTIONS: RationFieldInspectionRecord[] = [
  {
    id: 'rfi-1',
    inspectionNumber: 'INS-RAT-2026-01',
    inspectionDate: '2026-11-20',
    merchantCode: 'MER-GH-001',
    merchantName: 'محمود إبراهيم الششتاوي',
    village: 'صفط تراب',
    inspectorName: 'مفتش أول / هيثم الجندي',
    pricesDeclared: 'نعم',
    stockMatchesBook: 'مطابق',
    violationsFound: 'لا توجد مخالفات',
    reportNumberIfAny: '—',
    complianceScore: 98,
    reviewRecommendation: 'منفذ منضبط ومستوفٍ للاشتراطات',
    status: 'تم الفحص والمطابقة',
  },
  {
    id: 'rfi-2',
    inspectionNumber: 'INS-RAT-2026-02',
    inspectionDate: '2026-11-22',
    merchantCode: 'MER-GH-002',
    merchantName: 'السيد عبد الحميد الجزار',
    village: 'محلة أبو علي',
    inspectorName: 'مفتش أول / طارق النجار',
    pricesDeclared: 'لا',
    stockMatchesBook: 'عجز',
    violationsFound: 'عدم الإعلان عن أسعار المقررات + عجز ١٨ زجاجة زيت + انتهاء رخصة التشغيل',
    reportNumberIfAny: 'محضر رقم ٢١٤٤ جنح مركز المحلة',
    complianceScore: 54,
    reviewRecommendation: 'عرض على الشؤون القانونية وإعادة التفتيش خلال أسبوع',
    status: 'محضر محرر',
  },
];

export const INITIAL_RATION_COMPLAINTS: RationComplaintRecord[] = [
  {
    id: 'rcmp-1',
    complaintNumber: 'CMP-RAT-2026-101',
    complaintDate: '2026-11-21',
    citizenName: 'عادل محمود بدران',
    citizenPhone: '01012345678',
    village: 'محلة أبو علي',
    targetMerchantName: 'السيد عبد الحميد الجزار',
    subject: 'تأخر صرف المقررات وعدم تسليم بون الصرف',
    details: 'تقدم المواطن بشكوى تفيد بعدم تسليمه إيصال ماكينة POS وتأخر صرف الزيت التمويني.',
    assignedInspector: 'مفتش أول / طارق النجار',
    status: 'قيد الفحص',
    resolutionReply: 'تم النزول الميداني وجارٍ مراجعة سجل الماكينة',
  },
  {
    id: 'rcmp-2',
    complaintNumber: 'CMP-RAT-2026-102',
    complaintDate: '2026-11-19',
    citizenName: 'نادية عبد الله زيدان',
    citizenPhone: '01287654321',
    village: 'صفط تراب',
    targetMerchantName: 'محمود إبراهيم الششتاوي',
    subject: 'استفسار حول حصة السكر الإضافية',
    details: 'استفسار عن الحد الأقصى لكيلوجرامات السكر لبطاقة بها ٥ أفراد.',
    assignedInspector: 'مكتب تموين صفط تراب',
    status: 'تم الرد',
    resolutionReply: 'تم الرد على المواطنة وتوضيح المقرر القانوني (١ كجم لكل فرد بحد أقصى ٦ كجم للبطاقة).',
  },
];

export const INITIAL_RATION_SETTINGS: RationDepartmentSettings = {
  licenseWarningDays: 60,
  lowStockBufferPercent: 25,
  quotaDelayWarningPercent: 75,
  maskSensitiveCardDataByDefault: true,
  commodityCategories: [
    'السكر والزيوت الأساسية',
    'الحبوب والمكرونة والدقيق',
    'الألبان والمعلبات',
    'المنظفات والمستلزمات المنزلية',
    'الشاي والقهوة والصلصة',
  ],
  defaultSupportPerPersonEgp: 50,
};

export const INITIAL_RATION_AUDIT_LOGS: RationAuditLogRecord[] = [
  {
    id: 'ral-1',
    timestamp: '2026-11-25 09:15',
    userName: 'م. أحمد الحسيني',
    screenName: 'إدارة الحصص التموينية',
    actionType: 'اعتماد',
    details: 'اعتماد تعديل حصة السكر لمنفذ النور بصفط تراب بموافقة ٤١٢/٢٠٢٦',
  },
  {
    id: 'ral-2',
    timestamp: '2026-11-24 14:30',
    userName: 'أمين مخزن الجملة',
    screenName: 'إدارة المخازن والمشتريات',
    actionType: 'إضافة',
    details: 'قيد إذن استلام REC-2026-901 بكمية ١٥,٠٠٠ كيس سكر وتحديث الرصيد الآلي',
  },
];

// ==================== ٥٠ تقريراً رسمياً مصنفاً لمركز تقارير قسم السلع التموينية ====================
export const ALL_50_RATION_REPORTS: RationReportDefinition[] = [
  // ١. تقارير السلع والأسعار (١ - ٨)
  { id: 'rrep-01', num: 1, group: 'تقارير السلع والأسعار', title: '١. التقرير الشامل لسجل السلع التموينية المعتمدة', orientation: 'landscape' },
  { id: 'rrep-02', num: 2, group: 'تقارير السلع والأسعار', title: '٢. تقرير الأسعار التموينية وهوامش ربح التجار', orientation: 'landscape' },
  { id: 'rrep-03', num: 3, group: 'تقارير السلع والأسعار', title: '٣. السجل التاريخي لتعديلات أسعار السلع بالقرارات الوزارية', orientation: 'landscape' },
  { id: 'rrep-04', num: 4, group: 'تقارير السلع والأسعار', title: '٤. تقرير السلع غير المتوفرة أو التي بلغت حد إعادة الطلب', orientation: 'portrait' },
  { id: 'rrep-05', num: 5, group: 'تقارير السلع والأسعار', title: '٥. تقرير مقارنة السعر التمويني بالسعر الحر بالأسواق', orientation: 'portrait' },
  { id: 'rrep-06', num: 6, group: 'تقارير السلع والأسعار', title: '٦. تقرير الحدود القصوى للصرف لكل فرد وبطاقة', orientation: 'portrait' },
  { id: 'rrep-07', num: 7, group: 'تقارير السلع والأسعار', title: '٧. تقرير السلع حسب طبيعة التخزين ومدة الصلاحية', orientation: 'portrait' },
  { id: 'rrep-08', num: 8, group: 'تقارير السلع والأسعار', title: '٨. تقرير مصادر التوريد والشركات الموردة للسلع', orientation: 'portrait' },
  // ٢. تقارير التجار التموينيين والتراخيص (٩ - ١٨)
  { id: 'rrep-09', num: 9, group: 'تقارير التجار والتراخيص', title: '٩. الدليل الشامل للتجار التموينيين ومنافذ جمعيتي والمجمعات', orientation: 'landscape' },
  { id: 'rrep-10', num: 10, group: 'تقارير التجار والتراخيص', title: '١٠. تقرير توزيع التجار التموينيين حسب القرية والوحدة المحلية', orientation: 'portrait' },
  { id: 'rrep-11', num: 11, group: 'تقارير التجار والتراخيص', title: '١١. تقرير التجار ذوي التراخيص المنتهية أو القريبة من الانتهاء', orientation: 'landscape' },
  { id: 'rrep-12', num: 12, group: 'تقارير التجار والتراخيص', title: '١٢. تقرير انتهاء البطاقات الضريبية للتجار التموينيين', orientation: 'landscape' },
  { id: 'rrep-13', num: 13, group: 'تقارير التجار والتراخيص', title: '١٣. تقرير انتهاء السجلات التجارية للتجار التموينيين', orientation: 'landscape' },
  { id: 'rrep-14', num: 14, group: 'تقارير التجار والتراخيص', title: '١٤. تقرير التجار الموقوفين أو المخالفين أو قيد المراجعة', orientation: 'portrait' },
  { id: 'rrep-15', num: 15, group: 'تقارير التجار والتراخيص', title: '١٥. تقرير مبالغ التأمين المالي المودعة للتجار التموينيين', orientation: 'portrait' },
  { id: 'rrep-16', num: 16, group: 'تقارير التجار والتراخيص', title: '١٦. تقرير أرقام ماكينات POS وأكواد البطاقات الذكية', orientation: 'landscape' },
  { id: 'rrep-17', num: 17, group: 'تقارير التجار والتراخيص', title: '١٧. تقرير سجل متابعة التاجر والإنذارات الإدارية', orientation: 'portrait' },
  { id: 'rrep-18', num: 18, group: 'تقارير التجار والتراخيص', title: '١٨. تقرير ربط التجار بفروع الجملة والمكاتب التموينية', orientation: 'landscape' },
  // ٣. تقارير الحصص التموينية والتوريدات (١٩ - ٢٦)
  { id: 'rrep-19', num: 19, group: 'تقارير الحصص والتوريد', title: '١٩. التقرير الشهري الشامل للحصص التموينية ونسب التنفيذ', orientation: 'landscape' },
  { id: 'rrep-20', num: 20, group: 'تقارير الحصص والتوريد', title: '٢٠. تقرير الحصص المتأخرة في التوريد والمستحق استكمالها', orientation: 'landscape' },
  { id: 'rrep-21', num: 21, group: 'تقارير الحصص والتوريد', title: '٢١. تقرير تعديلات الحصص الموثقة بالقرارات والموافقات', orientation: 'landscape' },
  { id: 'rrep-22', num: 22, group: 'تقارير الحصص والتوريد', title: '٢٢. تقرير نسب صرف السكر والزيت حسب كل قرية', orientation: 'portrait' },
  { id: 'rrep-23', num: 23, group: 'تقارير الحصص والتوريد', title: '٢٣. تقرير الفجوة بين الحصة المعتمدة والكمية الموردة فعلياً', orientation: 'portrait' },
  { id: 'rrep-24', num: 24, group: 'تقارير الحصص والتوريد', title: '٢٤. تقرير الحصص المكتملة بنسبة ١٠٠٪ بالمنافذ', orientation: 'portrait' },
  { id: 'rrep-25', num: 25, group: 'تقارير الحصص والتوريد', title: '٢٥. تقرير مقارنة الحصص بين البقالين ومنافذ جمعيتي', orientation: 'portrait' },
  { id: 'rrep-26', num: 26, group: 'تقارير الحصص والتوريد', title: '٢٦. تقرير الحصص الموسمية والطارئة (رمضان والأعياد)', orientation: 'portrait' },
  // ٤. تقارير المخازن والمشتريات والجرد (٢٧ - ٣٤)
  { id: 'rrep-27', num: 27, group: 'تقارير المخازن والجرد', title: '٢٧. سجل المخازن والسعات التخزينية ونسب الإشغال', orientation: 'landscape' },
  { id: 'rrep-28', num: 28, group: 'تقارير المخازن والجرد', title: '٢٨. تقرير المشتريات وأذون الاستلام وتواريخ الصلاحية', orientation: 'landscape' },
  { id: 'rrep-29', num: 29, group: 'تقارير المخازن والجرد', title: '٢٩. دفتر حركة المخازن والأرصدة الختامية الآلية', orientation: 'landscape' },
  { id: 'rrep-30', num: 30, group: 'تقارير المخازن والجرد', title: '٣٠. تقرير التحويلات بين المخازن وحالة الاعتماد', orientation: 'landscape' },
  { id: 'rrep-31', num: 31, group: 'تقارير المخازن والجرد', title: '٣١. تقرير محاضر الجرد والمطابقة وفروق العجز والزيادة', orientation: 'landscape' },
  { id: 'rrep-32', num: 32, group: 'تقارير المخازن والجرد', title: '٣٢. تقرير التالف والمرتجعات والتسويات المخزنية', orientation: 'portrait' },
  { id: 'rrep-33', num: 33, group: 'تقارير المخازن والجرد', title: '٣٣. تقرير المخازن ذات الرصيد الحرج دون حد الأمان', orientation: 'portrait' },
  { id: 'rrep-34', num: 34, group: 'تقارير المخازن والجرد', title: '٣٤. تقرير تراخيص وسجلات المخازن وتواريخ انتهائها', orientation: 'landscape' },
  // ٥. تقارير البطاقات والمستفيدين وصرف المواطنين (٣٥ - ٤٣)
  { id: 'rrep-35', num: 35, group: 'تقارير البطاقات والمستفيدين', title: '٣٥. سجل البطاقات التموينية حسب الحالة (مع حماية الخصوصية)', orientation: 'landscape' },
  { id: 'rrep-36', num: 36, group: 'تقارير البطاقات والمستفيدين', title: '٣٦. تقرير البطاقات الموقوفة والتي تتطلب تحديث بيانات', orientation: 'portrait' },
  { id: 'rrep-37', num: 37, group: 'تقارير البطاقات والمستفيدين', title: '٣٧. إحصاء المستفيدين والبطاقات لعام ٢٠٢٣ حسب القرى', orientation: 'landscape' },
  { id: 'rrep-38', num: 38, group: 'تقارير البطاقات والمستفيدين', title: '٣٨. إحصاء المستفيدين والبطاقات لعام ٢٠٢٤ حسب القرى', orientation: 'landscape' },
  { id: 'rrep-39', num: 39, group: 'تقارير البطاقات والمستفيدين', title: '٣٩. إحصاء المستفيدين والبطاقات لعام ٢٠٢٥ حسب القرى', orientation: 'landscape' },
  { id: 'rrep-40', num: 40, group: 'تقارير البطاقات والمستفيدين', title: '٤٠. المقارنة السنوية لتطور أعداد المستفيدين (٢٠٢٣ – ٢٠٢٥)', orientation: 'landscape' },
  { id: 'rrep-41', num: 41, group: 'تقارير البطاقات والمستفيدين', title: '٤١. سجل عمليات صرف المواطنين اليومية والشهرية', orientation: 'landscape' },
  { id: 'rrep-42', num: 42, group: 'تقارير البطاقات والمستفيدين', title: '٤٢. تقرير إجمالي قيمة الدعم المنصرف وفروق السعر النقدية', orientation: 'portrait' },
  { id: 'rrep-43', num: 43, group: 'تقارير البطاقات والمستفيدين', title: '٤٣. تقرير العمليات الملغاة والقيود العكسية الموثقة', orientation: 'portrait' },
  // ٦. تقارير الرقابة والشكاوى والتنبيهات والتدقيق (٤٤ - ٥٠)
  { id: 'rrep-44', num: 44, group: 'تقارير الرقابة والشكاوى', title: '٤٤. تقرير الزيارات التفتيشية الميدانية ومعدلات الالتزام', orientation: 'landscape' },
  { id: 'rrep-45', num: 45, group: 'تقارير الرقابة والشكاوى', title: '٤٥. تقرير مؤشرات أداء التجار التموينيين للعرض القيادي', orientation: 'landscape' },
  { id: 'rrep-46', num: 46, group: 'تقارير الرقابة والشكاوى', title: '٤٦. تقرير المحاضر المحررة ضد المنافذ المخالفة', orientation: 'portrait' },
  { id: 'rrep-47', num: 47, group: 'تقارير الرقابة والشكاوى', title: '٤٧. التقرير الشامل للشكاوى التموينية وحالات الرد والإغلاق', orientation: 'landscape' },
  { id: 'rrep-48', num: 48, group: 'تقارير الرقابة والشكاوى', title: '٤٨. تقرير التنبيهات الذكية العاجلة والمرتفعة', orientation: 'landscape' },
  { id: 'rrep-49', num: 49, group: 'تقارير الرقابة والشكاوى', title: '٤٩. التقرير التنفيذي المجمع لمدير مديرية التموين بالغربية', orientation: 'landscape' },
  { id: 'rrep-50', num: 50, group: 'تقارير الرقابة والشكاوى', title: '٥٠. سجل التدقيق والمراجعة لكافة حركات قسم السلع التموينية', orientation: 'landscape' },
];

// ==================== محرك التنبيهات الذكي لقسم السلع التموينية ====================
export function buildRationSmartAlerts(params: {
  todayRef: string;
  settings: RationDepartmentSettings;
  commodities: RationCommodityRecord[];
  merchants: RationMerchantRecord[];
  quotas: RationQuotaRecord[];
  ledger: WarehouseLedgerMovementRecord[];
  stocktakes: WarehouseStocktakeRecord[];
  cards: RationCardRecord[];
  warehouses: RationWarehouseRecord[];
}): RationSmartAlertRecord[] {
  const { todayRef, settings, commodities, merchants, quotas, ledger, stocktakes, cards, warehouses } = params;
  const alerts: RationSmartAlertRecord[] = [];
  let seq = 1;

  const daysUntil = (iso: string) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 999;
    const t1 = new Date(todayRef).getTime();
    const t2 = new Date(iso).getTime();
    return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
  };

  // ١. تنبيهات السلع والمخزون
  commodities.forEach((c) => {
    if (c.status === 'غير متوفر') {
      alerts.push({
        id: `ra-com-${c.id}`,
        alertCode: `RAT-ALT-${String(seq++).padStart(3, '0')}`,
        category: 'تنبيهات السلع والمخزون',
        title: `سلعة غير متوفرة حالياً: ${c.commodityName}`,
        entityName: c.commodityCode,
        village: 'إدارة تموين مركز المحلة الكبرى',
        severity: 'عاجل',
        recommendedAction: 'مخاطبة الشركة العامة لتجارة الجملة لتعزيز الرصيد فوراً',
        createdAt: todayRef,
        status: 'مفتوح',
      });
    }
  });

  ledger.forEach((m) => {
    const com = commodities.find((c) => c.id === m.commodityId);
    if (com && m.computedClosingBalance <= com.minSafetyStock) {
      alerts.push({
        id: `ra-led-${m.id}`,
        alertCode: `RAT-ALT-${String(seq++).padStart(3, '0')}`,
        category: 'تنبيهات السلع والمخزون',
        title: `انخفاض رصيد (${m.commodityName}) دون حد الأمان (${m.computedClosingBalance} ${m.unit})`,
        entityName: m.warehouseName,
        village: 'المخازن المركزية',
        severity: 'مرتفع',
        recommendedAction: 'إصدار طلب توريد أو تحويل فوري من المخزن الرئيسي',
        createdAt: todayRef,
        status: 'مفتوح',
      });
    }
  });

  stocktakes.forEach((s) => {
    if (s.varianceQty < 0) {
      alerts.push({
        id: `ra-stk-${s.id}`,
        alertCode: `RAT-ALT-${String(seq++).padStart(3, '0')}`,
        category: 'تنبيهات السلع والمخزون',
        title: `عجز جرد فعلي (${Math.abs(s.varianceQty)} ${s.unit}) في ${s.commodityName}`,
        entityName: s.warehouseName,
        village: 'المخازن المركزية',
        severity: 'عاجل',
        recommendedAction: 'فتح تحقيق فوري ومراجعة أذون الصرف والوارد',
        createdAt: s.stocktakeDate,
        status: 'مفتوح',
      });
    }
  });

  // ٢. تنبيهات التجار والمخازن والتراخيص والضريبية والسجل التجاري
  merchants.forEach((m) => {
    const checks: { label: string; dt: string }[] = [
      { label: 'الترخيص', dt: m.licenseExpiryDate },
      { label: 'البطاقة الضريبية', dt: m.taxCardExpiryDate },
      { label: 'السجل التجاري', dt: m.commercialRegisterExpiryDate },
    ];
    checks.forEach((chk) => {
      const rem = daysUntil(chk.dt);
      if (rem < 0) {
        alerts.push({
          id: `ra-mer-${m.id}-${chk.label}`,
          alertCode: `RAT-ALT-${String(seq++).padStart(3, '0')}`,
          category: 'تنبيهات التجار والتراخيص',
          title: `انتهاء صلاحية ${chk.label} للتاجر (${m.merchantName})`,
          entityName: m.outletTradeName,
          village: m.village,
          severity: 'عاجل',
          recommendedAction: `إنذار التاجر بسرعة تجديد ${chk.label} وإيقاف الاستعاضة لحين السريان`,
          createdAt: todayRef,
          status: 'مفتوح',
        });
      } else if (rem <= settings.licenseWarningDays) {
        alerts.push({
          id: `ra-mer-soon-${m.id}-${chk.label}`,
          alertCode: `RAT-ALT-${String(seq++).padStart(3, '0')}`,
          category: 'تنبيهات التجار والتراخيص',
          title: `اقتراب انتهاء ${chk.label} خلال ${rem} يوماً للتاجر (${m.merchantName})`,
          entityName: m.outletTradeName,
          village: m.village,
          severity: 'متوسط',
          recommendedAction: `إخطار التاجر ببدء إجراءات تجديد ${chk.label}`,
          createdAt: todayRef,
          status: 'مفتوح',
        });
      }
    });
  });

  warehouses.forEach((w) => {
    const rem = daysUntil(w.licenseExpiryDate);
    if (rem <= settings.licenseWarningDays) {
      alerts.push({
        id: `ra-wh-${w.id}`,
        alertCode: `RAT-ALT-${String(seq++).padStart(3, '0')}`,
        category: 'تنبيهات التجار والتراخيص',
        title: rem < 0 ? `انتهاء ترخيص مخزن (${w.warehouseName})` : `اقتراب انتهاء ترخيص مخزن (${w.warehouseName}) خلال ${rem} يوماً`,
        entityName: w.warehouseCode,
        village: w.village,
        severity: rem < 0 ? 'عاجل' : 'مرتفع',
        recommendedAction: 'متابعة تجديد ترخيص المخزن مع الدفاع المدني ومديرية التموين',
        createdAt: todayRef,
        status: 'مفتوح',
      });
    }
  });

  // ٣. تنبيهات الحصص والتوريد
  quotas.forEach((q) => {
    const m = computeQuotaMetrics(q);
    if (m.supplyRatePct < settings.quotaDelayWarningPercent) {
      alerts.push({
        id: `ra-qta-${q.id}`,
        alertCode: `RAT-ALT-${String(seq++).padStart(3, '0')}`,
        category: 'تنبيهات الحصص والتوريد',
        title: `تأخر توريد حصة (${q.commodityName}) — نسبة التوريد ${m.supplyRatePct}٪ فقط`,
        entityName: q.merchantName,
        village: q.village,
        severity: 'مرتفع',
        recommendedAction: `سرعة استكمال توريد المتبقي (${m.remainingToSupply} ${q.unit}) من فرع الجملة`,
        createdAt: todayRef,
        status: 'مفتوح',
      });
    }
  });

  // ٤. تنبيهات البطاقات والصرف
  cards.forEach((c) => {
    if (c.status === 'موقوفة لحين التحديث' || c.status === 'بدل فاقد/تالف') {
      alerts.push({
        id: `ra-crd-${c.id}`,
        alertCode: `RAT-ALT-${String(seq++).padStart(3, '0')}`,
        category: 'تنبيهات البطاقات والصرف',
        title: `بطاقة تموينية بحالة (${c.status}) — ${c.headOfFamilyName}`,
        entityName: maskNationalIdOrCard(c.cardNumber, false),
        village: c.village,
        severity: 'منخفض',
        recommendedAction: 'متابعة مكتب التموين المختص لاستكمال التحديث وتفعيل الصرف',
        createdAt: todayRef,
        status: 'مفتوح',
      });
    }
  });

  return alerts;
}

// ==================== التخزين المحلي وإعادة ضبط المصنع ====================
const RATION_KEYS = {
  commodities: 'gharbia_ration_commodities_v1',
  priceHistory: 'gharbia_ration_price_history_v1',
  merchants: 'gharbia_ration_merchants_v1',
  followups: 'gharbia_ration_merchant_followups_v1',
  quotas: 'gharbia_ration_quotas_v1',
  warehouses: 'gharbia_ration_warehouses_v1',
  receipts: 'gharbia_ration_receipts_v1',
  ledger: 'gharbia_ration_ledger_v1',
  transfers: 'gharbia_ration_transfers_v1',
  stocktakes: 'gharbia_ration_stocktakes_v1',
  cards: 'gharbia_ration_cards_v1',
  beneficiaryStats: 'gharbia_ration_beneficiary_stats_v1',
  citizenIssues: 'gharbia_ration_citizen_issues_v1',
  inspections: 'gharbia_ration_inspections_v1',
  complaints: 'gharbia_ration_complaints_v1',
  auditLogs: 'gharbia_ration_audit_logs_v1',
  settings: 'gharbia_ration_settings_v1',
};

function safeLoad<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSave<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore storage errors
  }
}

export const loadRationCommodities = () => safeLoad(RATION_KEYS.commodities, INITIAL_RATION_COMMODITIES);
export const saveRationCommodities = (v: RationCommodityRecord[]) => safeSave(RATION_KEYS.commodities, v);

export const loadRationPriceHistory = () => safeLoad(RATION_KEYS.priceHistory, INITIAL_PRICE_HISTORY);
export const saveRationPriceHistory = (v: CommodityPriceHistoryRecord[]) => safeSave(RATION_KEYS.priceHistory, v);

export const loadRationMerchants = () => safeLoad(RATION_KEYS.merchants, INITIAL_RATION_MERCHANTS);
export const saveRationMerchants = (v: RationMerchantRecord[]) => safeSave(RATION_KEYS.merchants, v);

export const loadMerchantFollowups = () => safeLoad(RATION_KEYS.followups, INITIAL_MERCHANT_FOLLOWUPS);
export const saveMerchantFollowups = (v: MerchantFollowupLogRecord[]) => safeSave(RATION_KEYS.followups, v);

export const loadRationQuotas = () => safeLoad(RATION_KEYS.quotas, INITIAL_RATION_QUOTAS);
export const saveRationQuotas = (v: RationQuotaRecord[]) => safeSave(RATION_KEYS.quotas, v);

export const loadRationWarehouses = () => safeLoad(RATION_KEYS.warehouses, INITIAL_RATION_WAREHOUSES);
export const saveRationWarehouses = (v: RationWarehouseRecord[]) => safeSave(RATION_KEYS.warehouses, v);

export const loadWarehouseReceipts = () => safeLoad(RATION_KEYS.receipts, INITIAL_WAREHOUSE_RECEIPTS);
export const saveWarehouseReceipts = (v: WarehousePurchaseReceiptRecord[]) => safeSave(RATION_KEYS.receipts, v);

export const loadWarehouseLedger = () => safeLoad(RATION_KEYS.ledger, INITIAL_WAREHOUSE_LEDGER);
export const saveWarehouseLedger = (v: WarehouseLedgerMovementRecord[]) => safeSave(RATION_KEYS.ledger, v);

export const loadWarehouseTransfers = () => safeLoad(RATION_KEYS.transfers, INITIAL_WAREHOUSE_TRANSFERS);
export const saveWarehouseTransfers = (v: WarehouseTransferRecord[]) => safeSave(RATION_KEYS.transfers, v);

export const loadWarehouseStocktakes = () => safeLoad(RATION_KEYS.stocktakes, INITIAL_WAREHOUSE_STOCKTAKES);
export const saveWarehouseStocktakes = (v: WarehouseStocktakeRecord[]) => safeSave(RATION_KEYS.stocktakes, v);

export const loadRationCards = () => safeLoad(RATION_KEYS.cards, INITIAL_RATION_CARDS);
export const saveRationCards = (v: RationCardRecord[]) => safeSave(RATION_KEYS.cards, v);

export const loadVillageBeneficiaryStats = () => safeLoad(RATION_KEYS.beneficiaryStats, INITIAL_VILLAGE_BENEFICIARY_STATS);
export const saveVillageBeneficiaryStats = (v: VillageBeneficiaryStatRecord[]) => safeSave(RATION_KEYS.beneficiaryStats, v);

export const loadCitizenIssues = () => safeLoad(RATION_KEYS.citizenIssues, INITIAL_CITIZEN_ISSUES);
export const saveCitizenIssues = (v: CitizenIssueTransactionRecord[]) => safeSave(RATION_KEYS.citizenIssues, v);

export const loadRationInspections = () => safeLoad(RATION_KEYS.inspections, INITIAL_RATION_INSPECTIONS);
export const saveRationInspections = (v: RationFieldInspectionRecord[]) => safeSave(RATION_KEYS.inspections, v);

export const loadRationComplaints = () => safeLoad(RATION_KEYS.complaints, INITIAL_RATION_COMPLAINTS);
export const saveRationComplaints = (v: RationComplaintRecord[]) => safeSave(RATION_KEYS.complaints, v);

export const loadRationAuditLogs = () => safeLoad(RATION_KEYS.auditLogs, INITIAL_RATION_AUDIT_LOGS);
export const saveRationAuditLogs = (v: RationAuditLogRecord[]) => safeSave(RATION_KEYS.auditLogs, v);

export const loadRationSettings = () => safeLoad(RATION_KEYS.settings, INITIAL_RATION_SETTINGS);
export const saveRationSettings = (v: RationDepartmentSettings) => safeSave(RATION_KEYS.settings, v);

export function factoryResetRationCommoditiesStore(): void {
  saveRationCommodities([]);
  saveRationPriceHistory([]);
  saveRationMerchants([]);
  saveMerchantFollowups([]);
  saveRationQuotas([]);
  saveRationWarehouses([]);
  saveWarehouseReceipts([]);
  saveWarehouseLedger([]);
  saveWarehouseTransfers([]);
  saveWarehouseStocktakes([]);
  saveRationCards([]);
  saveVillageBeneficiaryStats([]);
  saveCitizenIssues([]);
  saveRationInspections([]);
  saveRationComplaints([]);
  saveRationAuditLogs([
    {
      id: `ral-reset-${Date.now()}`,
      timestamp: new Date().toLocaleString('ar-EG'),
      userName: 'مسؤول المنظومة',
      screenName: 'إعادة ضبط المصنع',
      actionType: 'إعادة ضبط المصنع',
      details: 'تم تفريغ جميع جداول قسم السلع التموينية بالكامل لبدء إدخال بيانات جديدة.',
    },
  ]);
}
