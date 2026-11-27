import { round2 } from './debts-engine';

export type EstablishmentStatus =
  | 'تعمل'
  | 'متوقفة مؤقتاً'
  | 'مغلقة'
  | 'تحت التصفية'
  | 'تم إلغاء النشاط'
  | 'غير معروفة الحالة'
  | 'تحتاج إلى معاينة';

export type OwnershipType = 'ملك' | 'إيجار' | 'أخرى';

export type ActivityNature = 'جملة' | 'تجزئة' | 'توزيع' | 'تخزين' | 'تصنيع' | 'خدمة';

export type LicenseStatusType =
  | 'ساري'
  | 'قارب على الانتهاء (٩٠ يوماً)'
  | 'قارب على الانتهاء (٦٠ يوماً)'
  | 'قارب على الانتهاء (٣٠ يوماً)'
  | 'قارب على الانتهاء (١٥ يوماً)'
  | 'قارب على الانتهاء (٧ أيام)'
  | 'منتهي'
  | 'موقوف'
  | 'بدون ترخيص';

export type SettlementStatusType =
  | 'لم يقدم طلب'
  | 'طلب مقدم'
  | 'تحت المراجعة'
  | 'مقبول'
  | 'مرفوض'
  | 'معتمد'
  | 'تم السداد'
  | 'لم يتم السداد'
  | 'تصالح جزئي'
  | 'مغلق';

export type SeizureMovementType =
  | 'الاستلام'
  | 'النقل'
  | 'الإضافة'
  | 'التسليم'
  | 'الإفراج'
  | 'الإعدام'
  | 'التسليم للجهة المختصة'
  | 'تصرف آخر معتمد';

export type CommodityAvailabilityStatus =
  | 'متوفر'
  | 'متوفر بكميات محدودة'
  | 'غير متوفر'
  | 'يوجد نقص'
  | 'يوجد ارتفاع غير معتاد في السعر'
  | 'يوجد تفاوت ملحوظ بين الأسواق';

export type PetroleumProductType =
  | 'بنزين 80'
  | 'بنزين 92'
  | 'بنزين 95'
  | 'سولار'
  | 'كيروسين'
  | 'منتجات بترولية أخرى';

export type TradeAlertSeverity = 'معلوماتي' | 'منخفض' | 'متوسط' | 'مرتفع' | 'عاجل';

// ٢. سجل المحلات والمنشآت التجارية (٢٥ حقلاً + ربط الأنشطة)
export interface CommercialEstablishmentRecord {
  id: string;
  autoCode: string; // 1. كود المنشأة التلقائي
  fileNumber: string; // 2. رقم ملف المنشأة
  name: string; // 3. اسم المحل أو المنشأة
  ownerName: string; // 4. اسم التاجر أو صاحب المنشأة
  ownerNationalId: string; // 5. الرقم القومي لصاحب المنشأة
  phone: string; // 6. رقم الهاتف
  email: string; // 7. البريد الإلكتروني
  managerName: string; // 8. اسم المدير المسؤول
  managerPhone: string; // 9. رقم هاتف المدير
  ownershipType: OwnershipType; // 10. نوع الملكية
  detailedAddress: string; // 11. عنوان المنشأة بالتفصيل
  governorate: string; // 12. المحافظة
  districtCenter: string; // 13. المركز
  supplyAdministration: string; // 14. الإدارة التموينية
  village: string; // 15. القرية
  localUnit: string; // 16. الوحدة المحلية
  street: string; // 17. الشارع
  buildingNumber: string; // 18. رقم العقار
  geoLocation: string; // 19. الموقع الجغرافي
  activityStartDate: string; // 20. تاريخ بدء النشاط
  commercialRegisterNumber: string; // 21. رقم السجل التجاري
  commercialRegisterExpiryDate: string; // تاريخ انتهاء السجل التجاري
  taxCardNumber: string; // 22. رقم البطاقة الضريبية
  taxCardExpiryDate: string; // تاريخ انتهاء البطاقة الضريبية
  licenseNumber: string; // رقم الترخيص التجاري
  licenseExpiryDate: string; // تاريخ انتهاء الترخيص التجاري
  status: EstablishmentStatus; // 23. حالة المنشأة
  category: string; // تصنيف المنشأة
  isLicensed: boolean;
  primaryActivityId: string;
  secondaryActivityIds: string[];
  hasUnregisteredOrMismatchedActivity: boolean;
  unregisteredActivityDetails?: string;
  lastInspectionDate: string;
  notes: string; // 24. ملاحظات
  attachments: string[]; // 25. صور ومستندات المنشأة
  createdAt: string;
}

// ٣. قاعدة بيانات الأنشطة التجارية
export interface CommercialActivityRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  nature: ActivityNature;
  requiresLicense: boolean;
  competentAuthority: string;
  requiredDocuments: string;
  regulations: string;
  status: 'نشط' | 'موقوف' | 'قيد المراجعة';
}

// ٤. قاعدة بيانات التراخيص التجارية
export interface CommercialLicenseRecord {
  id: string;
  licenseNumber: string;
  establishmentId: string;
  establishmentCode: string;
  establishmentName: string;
  ownerName: string;
  licenseType: string;
  competentAuthority: string; // الجهة المختصة الفعلية بإصدار الترخيص
  licensedActivityName: string;
  issueDate: string;
  expiryDate: string;
  taxCardNumber: string;
  taxCardExpiryDate: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiryDate: string;
  status: LicenseStatusType;
  fileNumber: string;
  licenseImage: string;
  attachedDocuments: string[];
  supplyAdministration: string;
  village: string;
  localUnit: string;
  responsibleEmployee: string;
  lastReviewDate: string;
  notes: string;
}

// ٥. إدارة الحملات التموينية والتفتيش
export interface TradeInspectionCampaignRecord {
  id: string;
  campaignNumber: string;
  campaignDate: string;
  startTime: string;
  endTime: string;
  supplyAdministration: string;
  campaignScope: string;
  village: string;
  localUnit: string;
  targetStreetsAndAreas: string;
  campaignType: string;
  campaignLeader: string;
  campaignMembers: string[];
  participatingAuthorities: string[];
  targetedEstablishmentsCount: number;
  inspectedEstablishmentsCount: number;
  violationsCount: number;
  reportsCount: number;
  seizuresCount: number;
  status: 'منفذة' | 'جاري تنفيذها' | 'مجدولة';
  resultSummary: string;
  notes: string;
  attachments: string[];
}

// ٦. دليل أنواع المخالفات التجارية والسند القانوني
export interface CommercialViolationCatalogItem {
  id: string;
  groupCode: 'أسعار' | 'غش' | 'تخزين' | 'تراخيص' | 'أوكازيون' | 'تموينية';
  groupTitle: string;
  title: string;
  legalBasisDecree: string;
  competentAuthority: string;
  approvedPenaltyMeasure: string;
  hasAutomaticFinancialFine: boolean;
  defaultBaseFineEgp: number;
  unit: string;
  isActive: boolean;
}

export interface CommercialViolationLineItem {
  id: string;
  catalogId: string;
  groupTitle: string;
  violationTitle: string;
  detailedDescription: string;
  seizedQuantity: number;
  unit: string;
  fineAmountEgp: number;
  legalBasis: string;
  competentAuthority: string;
  approvedMeasure: string;
}

export interface CommercialViolationReportRecord {
  id: string;
  reportNumber: string;
  campaignId?: string;
  campaignNumber?: string;
  reportDate: string;
  reportTime: string;
  establishmentId: string;
  establishmentCode: string;
  establishmentName: string;
  ownerName: string;
  activityType: string;
  supplyAdministration: string;
  village: string;
  localUnit: string;
  issuingAuthority: string;
  inspectorName: string;
  competentCaseNumber: string;
  items: CommercialViolationLineItem[];
  totalSeizedQuantitySummary: string;
  totalFineAmountEgp: number;
  legalBasisSummary: string;
  reportStatus: 'معتمد' | 'قيد المراجعة' | 'معروض على النيابة' | 'متصالح' | 'مغلق';
  isSettled: boolean;
  attachments: string[];
  notes: string;
}

// ٧. قاعدة بيانات التصالحات والمبالغ المالية
export interface CommercialSettlementRecord {
  id: string;
  reportId: string;
  reportNumber: string;
  settlementRequestNumber: string;
  establishmentId: string;
  establishmentName: string;
  traderName: string;
  violationTypeSummary: string;
  supplyAdministration: string;
  village: string;
  localUnit: string;
  dueAmountEgp: number;
  approvedSettlementAmountEgp: number;
  requestDate: string;
  approvalDate?: string;
  competentAuthority: string;
  status: SettlementStatusType;
  paymentReceiptNumber?: string;
  paymentDate?: string;
  paidAmountEgp: number;
  remainingAmountEgp: number;
  documents: string[];
  approvedBy?: string;
  notes: string;
}

// ٨. قاعدة بيانات المضبوطات والتحفظات التموينية ودفتر حركتها
export interface CommercialSeizureRecord {
  id: string;
  seizureNumber: string;
  reportId: string;
  reportNumber: string;
  campaignId?: string;
  campaignNumber?: string;
  seizureDate: string;
  establishmentId: string;
  establishmentName: string;
  traderName: string;
  supplyAdministration: string;
  village: string;
  localUnit: string;
  commodityCategory: string;
  productName: string;
  brandName: string;
  initialQuantity: number;
  currentActualBalance: number; // يحسب تلقائياً من الحركات المعتمدة
  unit: string;
  weightOrVolume: string;
  estimatedValueEgp: number; // تمييز قيمة المضبوطات عن الكمية المضبوطة
  commodityCondition: 'صالحة ظاهرياً' | 'مشتبه في صلاحيتها' | 'منتهية الصلاحية' | 'مجهولة المصدر' | 'مغشوشة';
  seizureReason: string;
  seizureLocation: string;
  custodyLocation: string;
  custodyAuthority: string;
  custodianName: string;
  inventoryReportNumber: string;
  photos: string[];
  documents: string[];
  legalStatus: 'تحت التحفظ' | 'بانتظار قرار النيابة' | 'صدر قرار إفراج' | 'صدر قرار إعدام' | 'تم التسليم للجهة المختصة';
  disposalDecisionNumber?: string;
  disposalDecisionText?: string;
  custodyExpiryDate: string;
}

export interface SeizureMovementRecord {
  id: string;
  movementNumber: string;
  seizureId: string;
  seizureNumber: string;
  reportNumber: string;
  movementType: SeizureMovementType;
  quantity: number;
  unit: string;
  movementDate: string;
  movementTime: string;
  deliveredBy: string;
  receivedBy: string;
  custodyLocationBefore: string;
  custodyLocationAfter: string;
  officialDecisionReference: string; // قرار موثق من الجهة المختصة
  isApproved: boolean;
  approvedBy: string;
  auditTrailNote: string;
}

// ٩. متابعة الأسواق والأسعار والسلع
export interface MarketCommodityRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  brandName: string;
  countryOfOrigin: string;
  commodityType: 'غذائية استراتيجية' | 'غذائية عامة' | 'استهلاكية ومنظفات' | 'أعلاف ومستلزمات' | 'طاقة ووقود';
  isEssential: boolean;
  isSubjectToPriceRegulation: boolean;
  officialReferenceMaxPriceEgp?: number;
  officialPriceDecreeRef?: string;
  officialPriceEffectiveDate?: string;
  availabilityStatus: CommodityAvailabilityStatus;
  notes: string;
}

export interface CommodityPriceObservationRecord {
  id: string;
  commodityId: string;
  commodityName: string;
  category: string;
  packageOrWeight: string;
  unit: string;
  minPriceEgp: number;
  maxPriceEgp: number;
  avgPriceEgp: number;
  announcedPriceEgp: number;
  observedPriceEgp: number;
  officialPriceEgp?: number;
  officialPriceSourceDecree?: string;
  officialPriceEffectiveDate?: string;
  marketName: string;
  establishmentName: string;
  village: string;
  localUnit: string;
  supplyAdministration: string;
  observationDate: string;
  inspectorName: string;
  priceSource: 'رصد ميداني مباشر' | 'قائمة أسعار معلنة' | 'فاتورة تداول' | 'تسعيرة رسمية معتمدة';
  availabilityStatus: CommodityAvailabilityStatus;
  notes: string;
}

// ١٠ و ١١. إدارة أسطوانات البوتاجاز ونصيب الفرد والمستفيدين (٢٠٢٣، ٢٠٢٤، ٢٠٢٥)
export interface ButaneYearlyStat {
  year: number;
  beneficiariesCount: number;
  allocatedCylinders: number;
  receivedCylinders: number;
  distributedCylinders: number;
  remainingCylinders: number;
}

export interface ButaneVillageAllocationRecord {
  id: string;
  supplyAdministration: string;
  districtCenter: string;
  village: string;
  localUnit: string;
  traderOrWarehouseName: string;
  taxCardNumber: string;
  taxCardExpiryDate: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiryDate: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  populationCount: number;
  familiesCount: number;
  beneficiariesCountCurrent: number;
  distributionOutletsCount: number;
  warehousesCount: number;
  allocatedQuotaCylinders: number;
  receivedQuantityCylinders: number;
  distributedQuantityCylinders: number;
  remainingQuantityCylinders: number;
  domesticCylindersCount: number;
  commercialCylindersCount: number;
  lastUpdatedDate: string;
  // سجلات تاريخية مستقلة لكل سنة (2023، 2024، 2025 وقابلة لإضافة سنوات جديدة)
  yearlyHistory: ButaneYearlyStat[];
}

// ١٢ و ١٣. إدارة المواد البترولية ونصيب الفرد والمستفيدين (٢٠٢٣، ٢٠٢٤، ٢٠٢٥)
export interface PetroleumYearlyStat {
  year: number;
  beneficiariesCount: number;
  allocatedQuantity: number;
  receivedQuantity: number;
  distributedQuantity: number;
  remainingQuantity: number;
}

export interface PetroleumAllocationRecord {
  id: string;
  supplyAdministration: string;
  village: string;
  localUnit: string;
  traderOrStationName: string;
  taxCardNumber: string;
  taxCardExpiryDate: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiryDate: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  productType: PetroleumProductType;
  beneficiariesCountCurrent: number;
  beneficiaryVehiclesOrEntitiesCount: number;
  openingBalance: number;
  allocatedQuota: number;
  receivedQuantity: number;
  distributedQuantity: number;
  remainingQuantity: number; // الرصيد الافتتاحي + الوارد المعتمد - المنصرف المعتمد
  unit: 'لتر' | 'طن';
  dataPeriod: string;
  dataSource: string;
  lastUpdatedDate: string;
  yearlyHistory: PetroleumYearlyStat[];
}

// ١٤. مراقبة محطات الوقود والحركة اليومية والرقابة
export interface FuelStationRecord {
  id: string;
  stationCode: string;
  stationName: string;
  operatingCompany: string;
  ownerOrManagerName: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  taxCardNumber: string;
  taxCardExpiryDate: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiryDate: string;
  supplyAdministration: string;
  village: string;
  localUnit: string;
  address: string;
  pumpsCount: number;
  fuelTypes: PetroleumProductType[];
  totalTanksCapacityLiters: number;
  safetyThresholdLiters: number;
  operationStatus: 'تعمل بكامل الطاقة' | 'تعمل جزئياً' | 'متوقفة للصيانة' | 'مغلقة إدارياً';
  phone: string;
  documents: string[];
}

export interface FuelStationDailyMovementRecord {
  id: string;
  movementDate: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  village: string;
  localUnit: string;
  productType: PetroleumProductType;
  openingBalanceLiters: number;
  receivedQuantityLiters: number;
  supplyPermitNumber: string;
  supplierEntity: string;
  soldQuantityLiters: number;
  dispensedQuantityLiters: number;
  approvedAdjustmentsLiters: number; // التسويات المعتمدة (±)
  bookClosingBalanceLiters: number; // الرصيد الافتتاحي + الوارد - المنصرف ± التسويات
  actualTankMeasurementLiters: number;
  meterReadingStart: number;
  meterReadingEnd: number;
  inventoryDiffLiters: number; // الفعلي - الدفتري
  responsibleName: string;
  isApproved: boolean;
  notes: string;
}

export interface FuelStationInspectionRecord {
  id: string;
  inspectionDate: string;
  inspectorName: string;
  stationId: string;
  stationName: string;
  village: string;
  productType: PetroleumProductType;
  meterReadingObserved: number;
  actualQuantityLiters: number;
  bookBalanceMatched: boolean;
  announcedPricesStatus: 'مطابقة للتسعيرة الرسمية' | 'غير معلنة' | 'مخالفة للتسعيرة';
  pumpsCondition: 'سليمة وتعمل' | 'عطل جزئي' | 'تلاعب / كسر رصاص';
  calibrationStatus: 'معايرة قانونية سارية' | 'تحتاج إعادة معايرة' | 'نقص في المعايرة';
  inspectionNotes: string;
  violationsFound: string;
  reportNumber?: string;
  photos: string[];
  recommendations: string;
}

// ١٥. مستودعات البوتاجاز والحركة اليومية
export interface ButaneWarehouseRecord {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  ownerName: string;
  managerName: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  taxCardNumber: string;
  taxCardExpiryDate: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiryDate: string;
  supplyAdministration: string;
  village: string;
  localUnit: string;
  address: string;
  storageCapacityCylinders: number;
  currentCylindersCount: number;
  cylinderTypes: 'منزلي ١٢٫٥ كجم وتجاري ٢٥ كجم' | 'منزلي ١٢٫٥ كجم فقط' | 'تجاري ٢٥ كجم فقط';
  operationStatus: 'يعمل بانتظام' | 'تحت الصيانة' | 'موقوف جزئياً';
  workersCount: number;
  phone: string;
  affiliatedDistributorsCount: number;
  servedAreas: string;
  beneficiaryVillages: string[];
  distributionPointsCount: number;
  allocatedMonthlyQuota: number;
  distributedMonthlyQuantity: number;
  safetyStockThreshold: number;
  photos: string[];
  documents: string[];
}

export interface ButaneWarehouseMovementRecord {
  id: string;
  movementDate: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  village: string;
  openingBalance: number;
  receivedQuantity: number;
  supplyPermitNumber: string;
  supplierEntity: string;
  dispensedQuantity: number;
  deliveryPermitToDistributorNo: string; // يربط بإذن استلام الموزع لمنع التكرار
  domesticCylindersCount: number;
  commercialCylindersCount: number;
  returnedCylindersCount: number; // المرتجع المعتمد (+)
  excludedDamagedCylindersCount: number; // التالف المستبعد بمستند معتمد (-)
  damagedExclusionDocNo?: string;
  closingBalance: number; // الافتتاحي + الوارد - المنصرف + المرتجع - التالف المستبعد
  actualCount: number;
  discrepancyDiff: number;
  responsibleName: string;
  isApproved: boolean;
}

// ١٦. سجل موزعي أسطوانات البوتاجاز وحركتهم اليومية
export interface ButaneDistributorRecord {
  id: string;
  distributorCode: string;
  distributorName: string;
  nationalId: string;
  phone: string;
  address: string;
  supplyAdministration: string;
  village: string;
  localUnit: string;
  affiliatedWarehouseId: string;
  affiliatedWarehouseName: string;
  permitOrLicenseNumber: string;
  licenseExpiryDate: string;
  taxCardNumber: string;
  taxCardExpiryDate: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiryDate: string;
  startDate: string;
  status: 'نشط' | 'موقوف مؤقتاً' | 'ملغي التصريح';
  assignedAreas: string;
  transportMode: 'سيارة ربع نقل مرخصة' | 'تروسيكل معتمد' | 'جرار بمقطورة' | 'منفذ توزيع ثابت';
  vehiclePlateNumber: string;
  vehicleCapacityCylinders: number;
  allocatedCylindersQuota: number;
  documents: string[];
  notes: string;
}

export interface ButaneDistributorMovementRecord {
  id: string;
  movementDate: string;
  distributorId: string;
  distributorName: string;
  warehouseId: string;
  warehouseName: string;
  warehouseDeliveryPermitNo: string; // رقم إذن تسليم المستودع المرتبط لمنع ازدواجية الاحتساب
  previousBalance: number;
  receivedCylinders: number;
  distributedCylinders: number;
  returnedCylinders: number;
  approvedDamagedCylinders: number;
  remainingBalance: number; // الرصيد السابق + المستلم - الموزع - التالف المعتمد + المرتجع المعتمد
  servedVillages: string;
  beneficiariesServedCount: number;
  officialUnitPriceEgp: number;
  receiptOrDeliveryDocNo: string;
  responsibleName: string;
  isApproved: boolean;
  notes: string;
}

// ١٨. التنبيهات الذكية لقسم التجارة الداخلية
export interface InternalTradeAlertRecord {
  id: string;
  alertNumber: string;
  domainCategory:
    | 'تنبيهات المنشآت والتراخيص'
    | 'تنبيهات الحملات والمخالفات'
    | 'تنبيهات الأسواق والأسعار'
    | 'تنبيهات البوتاجاز والوقود';
  alertType: string;
  sourceSection: string;
  linkedRecordCode: string;
  linkedRecordTitle: string;
  supplyAdministration: string;
  village: string;
  severity: TradeAlertSeverity;
  createdAt: string;
  responsibleEmployee: string;
  requiredAction: string;
  dueDate: string;
  status: 'مفتوح' | 'قيد المعالجة' | 'تمت المعالجة ومغلق';
  closedAt?: string;
  resolutionNotes?: string;
}

// ٢٠. إعدادات القسم وقواعد الاحتساب والصلاحيات
export interface InternalTradeSettings {
  licenseAlertThresholdsDays: number[]; // [90, 60, 30, 15, 7]
  uninspectedEstablishmentMaxDays: number; // مثلاً 45 يوماً
  marketPriceStaleMaxDays: number; // مثلاً 7 أيام
  butanePerCapitaBasis: 'للمستفيد بالأسطوانة' | 'للفرد بالأسطوانة' | 'للأسرة بالأسطوانة' | 'للمستفيد بالكيلوجرام';
  approvedDomesticCylinderWeightKg: number; // 12.5 كجم
  approvedCommercialCylinderWeightKg: number; // 25 كجم
  fuelLowStockDefaultAlertLiters: number;
  butaneWarehouseLowStockAlertCylinders: number;
  establishmentCategories: string[];
  licenseTypes: { title: string; competentAuthority: string }[];
  campaignTypes: string[];
}

// ==================== المعادلات الموحدة لقسم التجارة الداخلية ====================

export function computeLicenseAlertStatus(
  expiryDate: string | undefined,
  isLicensed: boolean,
  todayRef: string,
  thresholds: number[] = [90, 60, 30, 15, 7]
): { status: LicenseStatusType; daysRemaining: number | null; severity: TradeAlertSeverity | 'سليم' } {
  if (!isLicensed || !expiryDate) {
    return { status: 'بدون ترخيص', daysRemaining: null, severity: 'عاجل' };
  }
  const t0 = new Date(todayRef).getTime();
  const tExp = new Date(expiryDate).getTime();
  if (Number.isNaN(t0) || Number.isNaN(tExp)) {
    return { status: 'بدون ترخيص', daysRemaining: null, severity: 'مرتفع' };
  }
  const days = Math.ceil((tExp - t0) / 86400000);
  if (days < 0) {
    return { status: 'منتهي', daysRemaining: days, severity: 'عاجل' };
  }
  const sorted = [...thresholds].sort((a, b) => a - b); // [7, 15, 30, 60, 90]
  if (days <= (sorted[0] ?? 7)) {
    return { status: 'قارب على الانتهاء (٧ أيام)', daysRemaining: days, severity: 'عاجل' };
  }
  if (days <= (sorted[1] ?? 15)) {
    return { status: 'قارب على الانتهاء (١٥ يوماً)', daysRemaining: days, severity: 'مرتفع' };
  }
  if (days <= (sorted[2] ?? 30)) {
    return { status: 'قارب على الانتهاء (٣٠ يوماً)', daysRemaining: days, severity: 'متوسط' };
  }
  if (days <= (sorted[3] ?? 60)) {
    return { status: 'قارب على الانتهاء (٦٠ يوماً)', daysRemaining: days, severity: 'منخفض' };
  }
  if (days <= (sorted[4] ?? 90)) {
    return { status: 'قارب على الانتهاء (٩٠ يوماً)', daysRemaining: days, severity: 'معلوماتي' };
  }
  return { status: 'ساري', daysRemaining: days, severity: 'سليم' };
}

export function computeButanePerCapitaShare(params: {
  distributedCylinders: number;
  beneficiariesCount: number;
  populationCount: number;
  familiesCount: number;
  basis: InternalTradeSettings['butanePerCapitaBasis'];
  domesticCylinderWeightKg: number;
}): {
  valid: boolean;
  shareValue: number;
  unitLabel: string;
  warningMessage?: string;
} {
  const denom =
    params.basis === 'للفرد بالأسطوانة'
      ? params.populationCount
      : params.basis === 'للأسرة بالأسطوانة'
      ? params.familiesCount
      : params.beneficiariesCount;

  if (!denom || denom <= 0) {
    return {
      valid: false,
      shareValue: 0,
      unitLabel: '-',
      warningMessage: 'تنبيه: بيانات عدد المستفيدين غير مكتملة أو تساوي صفراً؛ لا يتم إجراء القسمة.',
    };
  }

  if (params.basis === 'للمستفيد بالكيلوجرام') {
    const totalKg = params.distributedCylinders * (params.domesticCylinderWeightKg || 12.5);
    return {
      valid: true,
      shareValue: round2(totalKg / denom),
      unitLabel: 'كجم / مستفيد',
    };
  }

  const label =
    params.basis === 'للفرد بالأسطوانة'
      ? 'أسطوانة / فرد'
      : params.basis === 'للأسرة بالأسطوانة'
      ? 'أسطوانة / أسرة'
      : 'أسطوانة / مستفيد';

  return {
    valid: true,
    shareValue: round2(params.distributedCylinders / denom),
    unitLabel: label,
  };
}

export function computePetroleumMetrics(params: {
  openingBalance: number;
  allocatedQuota: number;
  receivedQuantity: number;
  distributedQuantity: number;
  beneficiariesCount: number;
}): {
  remainingQuantity: number;
  distributionPercentage: number;
  perBeneficiaryShare: number | null;
  incompleteBeneficiariesWarning: boolean;
} {
  const remainingQuantity = round2(
    (Number(params.openingBalance) || 0) +
      (Number(params.receivedQuantity) || 0) -
      (Number(params.distributedQuantity) || 0)
  );
  const distributionPercentage =
    params.allocatedQuota > 0
      ? round2(((Number(params.distributedQuantity) || 0) / params.allocatedQuota) * 100)
      : 0;

  if (!params.beneficiariesCount || params.beneficiariesCount <= 0) {
    return {
      remainingQuantity,
      distributionPercentage,
      perBeneficiaryShare: null,
      incompleteBeneficiariesWarning: true,
    };
  }

  return {
    remainingQuantity,
    distributionPercentage,
    perBeneficiaryShare: round2((Number(params.distributedQuantity) || 0) / params.beneficiariesCount),
    incompleteBeneficiariesWarning: false,
  };
}

export function computeFuelStationClosingBalance(params: {
  openingBalanceLiters: number;
  receivedQuantityLiters: number;
  dispensedQuantityLiters: number;
  approvedAdjustmentsLiters: number;
  actualTankMeasurementLiters: number;
}): {
  bookClosingBalanceLiters: number;
  inventoryDiffLiters: number;
} {
  const bookClosingBalanceLiters = round2(
    (Number(params.openingBalanceLiters) || 0) +
      (Number(params.receivedQuantityLiters) || 0) -
      (Number(params.dispensedQuantityLiters) || 0) +
      (Number(params.approvedAdjustmentsLiters) || 0)
  );
  const inventoryDiffLiters = round2(
    (Number(params.actualTankMeasurementLiters) || 0) - bookClosingBalanceLiters
  );
  return { bookClosingBalanceLiters, inventoryDiffLiters };
}

export function computeButaneWarehouseClosingBalance(params: {
  openingBalance: number;
  receivedQuantity: number;
  dispensedQuantity: number;
  returnedCylindersCount: number;
  excludedDamagedCylindersCount: number;
  actualCount: number;
}): {
  closingBalance: number;
  discrepancyDiff: number;
} {
  const closingBalance = Math.round(
    (Number(params.openingBalance) || 0) +
      (Number(params.receivedQuantity) || 0) -
      (Number(params.dispensedQuantity) || 0) +
      (Number(params.returnedCylindersCount) || 0) -
      (Number(params.excludedDamagedCylindersCount) || 0)
  );
  const discrepancyDiff = Math.round((Number(params.actualCount) || 0) - closingBalance);
  return { closingBalance, discrepancyDiff };
}

export function computeDistributorRemainingBalance(params: {
  previousBalance: number;
  receivedCylinders: number;
  distributedCylinders: number;
  approvedDamagedCylinders: number;
  returnedCylinders: number;
}): number {
  return Math.round(
    (Number(params.previousBalance) || 0) +
      (Number(params.receivedCylinders) || 0) -
      (Number(params.distributedCylinders) || 0) -
      (Number(params.approvedDamagedCylinders) || 0) +
      (Number(params.returnedCylinders) || 0)
  );
}

// ==================== البيانات الأولية المعتمدة لقسم التجارة الداخلية بالغربية ====================

export const INITIAL_INTERNAL_TRADE_SETTINGS: InternalTradeSettings = {
  licenseAlertThresholdsDays: [90, 60, 30, 15, 7],
  uninspectedEstablishmentMaxDays: 45,
  marketPriceStaleMaxDays: 7,
  butanePerCapitaBasis: 'للمستفيد بالأسطوانة',
  approvedDomesticCylinderWeightKg: 12.5,
  approvedCommercialCylinderWeightKg: 25,
  fuelLowStockDefaultAlertLiters: 8000,
  butaneWarehouseLowStockAlertCylinders: 450,
  establishmentCategories: [
    'محلات تجارية',
    'سوبر ماركت',
    'بقالة',
    'مخازن تجارية',
    'تجار جملة',
    'تجار تجزئة',
    'محلات مواد غذائية',
    'محلات زيوت وسمن',
    'محلات منظفات',
    'محلات أعلاف',
    'محلات حبوب وغلال',
    'محلات بيع أسمدة ومستلزمات زراعية',
    'مخازن توزيع السلع',
    'منافذ بيع',
    'منشآت تجارية أخرى',
  ],
  licenseTypes: [
    { title: 'ترخيص محل تجاري', competentAuthority: 'مركز إصدار تراخيص المحال العامة بالوحدة المحلية' },
    { title: 'ترخيص مخزن', competentAuthority: 'الإدارة الهندسية وتراخيص المحال بالمركز' },
    { title: 'ترخيص نشاط تجاري متخصص', competentAuthority: 'مديرية التموين والتجارة الداخلية بالغربية' },
    { title: 'ترخيص تداول أو توزيع سلعة منظمة', competentAuthority: 'وزارة التموين والتجارة الداخلية — قطاع التجارة الداخلية' },
    { title: 'ترخيص مستودع بوتاجاز', competentAuthority: 'مديرية التموين بالغربية ولجنة البوتاجاز وشركة الغازات البترولية' },
    { title: 'ترخيص محطة وقود', competentAuthority: 'الهيئة المصرية العامة للبترول ومديرية التموين بالغربية' },
    { title: 'تصاريح أو موافقات أخرى حسب الاختصاص', competentAuthority: 'الجهة الإدارية المختصة بالمحافظة' },
  ],
  campaignTypes: [
    'حملات متابعة الأسواق',
    'حملات ضبط الأسعار',
    'حملات مراقبة تداول السلع',
    'حملات متابعة المحلات التجارية',
    'حملات متابعة المخازن',
    'حملات مكافحة الغش التجاري',
    'حملات متابعة صلاحية السلع',
    'حملات متابعة الأوكازيون والتخفيضات',
    'حملات متابعة محطات الوقود',
    'حملات متابعة مستودعات البوتاجاز',
    'حملات متابعة الموزعين',
    'حملات مشتركة',
    'حملات مفاجئة',
    'حملات بناءً على شكاوى',
    'حملات أخرى',
  ],
};

export const INITIAL_COMMERCIAL_ACTIVITIES: CommercialActivityRecord[] = [
  {
    id: 'act-01',
    code: 'ACT-101',
    name: 'تجارة السلع الغذائية والاستراتيجية بالجملة',
    category: 'مواد غذائية',
    description: 'توريد وتوزيع السكر والأرز والزيوت والبقوليات لتجار التجزئة',
    nature: 'جملة',
    requiresLicense: true,
    competentAuthority: 'مركز تراخيص المحال العامة + مديرية التموين بالغربية',
    requiredDocuments: 'السجل التجاري، البطاقة الضريبية، شهادة صحية، عقد الملكية/الإيجار، موافقة الدفاع المدني',
    regulations: 'إمساك دفاتر الوارد والمنصرف، إصدار فواتير ضريبية، الإعلان عن الأسعار',
    status: 'نشط',
  },
  {
    id: 'act-02',
    code: 'ACT-102',
    name: 'سوبر ماركت وبيع المواد الغذائية بالتجزئة',
    category: 'سوبر ماركت وبقالة',
    description: 'بيع كافة السلع الغذائية والألبان والمنظفات للمستهلك النهائي',
    nature: 'تجزئة',
    requiresLicense: true,
    competentAuthority: 'مركز إصدار تراخيص المحال العامة بالوحدة المحلية',
    requiredDocuments: 'سجل تجاري، بطاقة ضريبية، شهادات صحية للعاملين، رسم كروكي للمحل',
    regulations: 'وضع بطاقات الأسعار على كافة المعروضات، حفظ المبردات في درجات الحرارة المقررة',
    status: 'نشط',
  },
  {
    id: 'act-03',
    code: 'ACT-103',
    name: 'تخزين وتعبئة الحبوب والغلال والأعلاف',
    category: 'أعلاف وحبوب',
    description: 'تخزين وتجارة الذرة الصفراء والردة وكسب الصويا والأعلاف الحيوانية والداجنة',
    nature: 'تخزين',
    requiresLicense: true,
    competentAuthority: 'مديرية التموين بالغربية + مديرية الزراعة بالغربية',
    requiredDocuments: 'ترخيص مخزن، تسجيل الأعلاف بوزارة الزراعة، فواتير المصدر والمصنع',
    regulations: 'التخزين على طبالي خشبية، التهوية الجيدة، تدوين تاريخ الإنتاج والصلاحية ورقم التسجيل',
    status: 'نشط',
  },
  {
    id: 'act-04',
    code: 'ACT-104',
    name: 'تجارة الزيوت والسمن والمنظفات الصناعية',
    category: 'زيوت ومنظفات',
    description: 'تداول الزيوت النباتية والمسلى والمنظفات المنزلية',
    nature: 'تجزئة',
    requiresLicense: true,
    competentAuthority: 'مركز تراخيص المحال العامة',
    requiredDocuments: 'سجل تجاري، بطاقة ضريبية، فواتير شراء من مصانع مرخصة',
    regulations: 'منع تداول المنظفات أو الزيوت السائبة مجهولة المصدر، الفصل التام بين المنظفات والأغذية',
    status: 'نشط',
  },
  {
    id: 'act-05',
    code: 'ACT-105',
    name: 'توزيع وتداول أسطوانات البوتاجاز المنزلية والتجارية',
    category: 'طاقة وبوتاجاز',
    description: 'استلام وتوزيع أسطوانات الغاز السائل للمواطنين والمحال',
    nature: 'توزيع',
    requiresLicense: true,
    competentAuthority: 'مديرية التموين والتجارة الداخلية بالغربية — إدارة المواد البترولية',
    requiredDocuments: 'ترخيص مستودع/تصريح توزيع، موافقة الحماية المدنية، عقد التوريد مع شركة بتروجاس',
    regulations: 'الالتزام بالسعر الرسمي والأوزان القانونية (١٢٫٥ كجم منزلي و٢٥ كجم تجاري) وإمساك دفتر الحركة',
    status: 'نشط',
  },
  {
    id: 'act-06',
    code: 'ACT-106',
    name: 'تشغيل محطة تموين وخدمة السيارات بالمواد البترولية',
    category: 'محطات وقود',
    description: 'تخزين وبيع البنزين (80/92/95) والسولار والزيوت',
    nature: 'خدمة',
    requiresLicense: true,
    competentAuthority: 'الهيئة المصرية العامة للبترول + مديرية التموين بالغربية',
    requiredDocuments: 'ترخيص تشغيل محطة، شهادة معايرة الطلمبات، سجل تجاري، موافقة البيئة والحماية المدنية',
    regulations: 'إمساك سجل ٢١ بترول، مطابقة العدادات، عدم كسر الرصاص، الالتزام بالتسعيرة الرسمية',
    status: 'نشط',
  },
];

export const INITIAL_COMMERCIAL_ESTABLISHMENTS: CommercialEstablishmentRecord[] = [
  {
    id: 'est-101',
    autoCode: 'TRD-GH-2026-001',
    fileNumber: 'ملف-ت/٤١٠٢',
    name: 'شركة ومخازن التوحيد لتجارة المواد الغذائية بالجملة',
    ownerName: 'الحاج محمود عبد السلام الشناوي',
    ownerNationalId: '27204151601425',
    phone: '01002345611',
    email: 'altawheed.trade@example.com',
    managerName: 'أ. رامي محمود الشناوي',
    managerPhone: '01002345699',
    ownershipType: 'ملك',
    detailedAddress: 'شارع البحر الرئيسي — بجوار المزلقان — قرية صفط تراب',
    governorate: 'الغربية',
    districtCenter: 'مركز المحلة الكبرى',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    street: 'شارع البحر الرئيسي',
    buildingNumber: '١٤ أ',
    geoLocation: '30.9412, 31.1845',
    activityStartDate: '2016-05-10',
    commercialRegisterNumber: '88412 محلة',
    commercialRegisterExpiryDate: '2028-04-30',
    taxCardNumber: '512-741-963',
    taxCardExpiryDate: '2027-12-31',
    licenseNumber: 'ر.ت/٢٠٢١/٤٤١٠',
    licenseExpiryDate: '2027-12-31',
    status: 'تعمل',
    category: 'تجار جملة',
    isLicensed: true,
    primaryActivityId: 'act-01',
    secondaryActivityIds: ['act-04'],
    hasUnregisteredOrMismatchedActivity: false,
    lastInspectionDate: '2026-11-18',
    notes: 'منشأة منتظمة في إمساك الفواتير ودفاتر الوارد والمنصرف',
    attachments: ['رخصة_التشغيل.pdf', 'السجل_التجاري_88412.pdf'],
    createdAt: '2026-01-10T09:00:00Z',
  },
  {
    id: 'est-102',
    autoCode: 'TRD-GH-2026-002',
    fileNumber: 'ملف-ت/٤١٠٩',
    name: 'هايبر وسوبر ماركت البركة الحديث',
    ownerName: 'سعيد مصطفى أبو العزم',
    ownerNationalId: '28009121602311',
    phone: '01228765432',
    email: 'elbaraka.market@example.com',
    managerName: 'أ. تامر سعيد مصطفى',
    managerPhone: '01228765400',
    ownershipType: 'إيجار',
    detailedAddress: 'طريق طنطا المحلة — مدخل قرية الهياتم',
    governorate: 'الغربية',
    districtCenter: 'مركز المحلة الكبرى',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    street: 'الشارع العمومي',
    buildingNumber: '٢٨',
    geoLocation: '30.9154, 31.1422',
    activityStartDate: '2019-08-01',
    commercialRegisterNumber: '91204 محلة',
    commercialRegisterExpiryDate: '2026-12-10',
    taxCardNumber: '623-852-147',
    taxCardExpiryDate: '2026-11-10', // منتهية لاختبار تقرير البطاقة الضريبية المنتهية
    licenseNumber: 'ر.م.ع/٢٠١٩/١١٨٥',
    licenseExpiryDate: '2026-12-08',
    status: 'تعمل',
    category: 'سوبر ماركت',
    isLicensed: true,
    primaryActivityId: 'act-02',
    secondaryActivityIds: ['act-04'],
    hasUnregisteredOrMismatchedActivity: false,
    lastInspectionDate: '2026-11-21',
    notes: 'البطاقة الضريبية تحتاج إلى تجديد عاجل',
    attachments: ['ترخيص_المحل_العام.pdf'],
    createdAt: '2026-01-12T10:00:00Z',
  },
  {
    id: 'est-103',
    autoCode: 'TRD-GH-2026-003',
    fileNumber: 'ملف-ت/٤١١٥',
    name: 'مخازن الدلتا للأعلاف والحبوب والغلال',
    ownerName: 'عبد الفتاح السيد الجمل',
    ownerNationalId: '27603221601874',
    phone: '01114569870',
    email: 'delta.feeds@example.com',
    managerName: 'أ. حسام عبد الفتاح الجمل',
    managerPhone: '01114569871',
    ownershipType: 'ملك',
    detailedAddress: 'المنطقة القبلية — قرية محلة أبو علي',
    governorate: 'الغربية',
    districtCenter: 'مركز المحلة الكبرى',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    street: 'شارع الترعة',
    buildingNumber: '٧',
    geoLocation: '30.9611, 31.2190',
    activityStartDate: '2021-02-15',
    commercialRegisterNumber: '95410 محلة',
    commercialRegisterExpiryDate: '2026-10-15', // منتهي لاختبار تقرير السجل التجاري المنتهي
    taxCardNumber: '741-963-258',
    taxCardExpiryDate: '2027-08-20',
    licenseNumber: 'بدون ترخيص',
    licenseExpiryDate: '2026-09-01',
    status: 'تحتاج إلى معاينة',
    category: 'محلات أعلاف',
    isLicensed: false,
    primaryActivityId: 'act-03',
    secondaryActivityIds: [],
    hasUnregisteredOrMismatchedActivity: true,
    unregisteredActivityDetails: 'يمارس نشاط تعبئة زيوت طعام وبيع أسمدة دون ترخيص أو إضافة بالسجل التجاري',
    lastInspectionDate: '2026-09-10', // مر عليه أكثر من 45 يوماً
    notes: 'منشأة غير مرخصة وتمارس نشاطاً إضافياً غير مسجل',
    attachments: ['محضر_معاينة_مبدئية.pdf'],
    createdAt: '2026-02-01T11:30:00Z',
  },
  {
    id: 'est-104',
    autoCode: 'TRD-GH-2026-004',
    fileNumber: 'ملف-ت/٤١٢٢',
    name: 'معرض ومخزن النور للسلع والمنظفات',
    ownerName: 'إبراهيم كمال الدسوقي',
    ownerNationalId: '28311051603214',
    phone: '01098741236',
    email: 'elnour.store@example.com',
    managerName: 'إبراهيم كمال الدسوقي',
    managerPhone: '01098741236',
    ownershipType: 'إيجار',
    detailedAddress: 'شارع السوق الكبير — قرية بشبيش',
    governorate: 'الغربية',
    districtCenter: 'مركز المحلة الكبرى',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    street: 'شارع السوق الكبير',
    buildingNumber: '٥٢',
    geoLocation: '31.1120, 31.1980',
    activityStartDate: '2020-11-01',
    commercialRegisterNumber: '93112 محلة',
    commercialRegisterExpiryDate: '2027-11-01',
    taxCardNumber: '852-147-369',
    taxCardExpiryDate: '2027-11-01',
    licenseNumber: 'ر.م.خ/٢٠٢٠/٩٩٢',
    licenseExpiryDate: '2026-10-15',
    status: 'تعمل',
    category: 'محلات منظفات',
    isLicensed: true,
    primaryActivityId: 'act-04',
    secondaryActivityIds: ['act-02'],
    hasUnregisteredOrMismatchedActivity: false,
    lastInspectionDate: '2026-11-22',
    notes: 'ملتزم بالإعلان عن الأسعار',
    attachments: ['رخصة_محل_بشبيش.pdf'],
    createdAt: '2026-02-15T09:00:00Z',
  },
  {
    id: 'est-105',
    autoCode: 'TRD-GH-2026-005',
    fileNumber: 'ملف-ت/٤١٣٠',
    name: 'مؤسسة الصفا لتوزيع المواد الغذائية والزيوت',
    ownerName: 'عادل عبد المنعم الشرقاوي',
    ownerNationalId: '27807191601988',
    phone: '01065478912',
    email: 'elsafa.foods@example.com',
    managerName: 'أ. وليد عادل الشرقاوي',
    managerPhone: '01065478913',
    ownershipType: 'ملك',
    detailedAddress: 'الشارع الجديد — قرية البنوان',
    governorate: 'الغربية',
    districtCenter: 'مركز المحلة الكبرى',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'البنوان',
    localUnit: 'الوحدة المحلية بالبنوان',
    street: 'الشارع الجديد',
    buildingNumber: '١٩',
    geoLocation: '31.0245, 31.1124',
    activityStartDate: '2018-04-20',
    commercialRegisterNumber: '89541 محلة',
    commercialRegisterExpiryDate: '2027-06-15',
    taxCardNumber: '951-753-852',
    taxCardExpiryDate: '2027-06-15',
    licenseNumber: 'ر.ت.م/٢٠٢٢/٣٣٠١',
    licenseExpiryDate: '2027-01-10',
    status: 'تعمل',
    category: 'مخازن توزيع السلع',
    isLicensed: true,
    primaryActivityId: 'act-01',
    secondaryActivityIds: [],
    hasUnregisteredOrMismatchedActivity: false,
    lastInspectionDate: '2026-11-19',
    notes: 'تم فحص فواتير السكر والأرز المعبأ',
    attachments: ['رخصة_مخزن_البنوان.pdf'],
    createdAt: '2026-03-01T10:00:00Z',
  },
];

export const INITIAL_COMMERCIAL_LICENSES: CommercialLicenseRecord[] = [
  {
    id: 'lic-201',
    licenseNumber: 'ر.ت/٢٠٢١/٤٤١٠',
    establishmentId: 'est-101',
    establishmentCode: 'TRD-GH-2026-001',
    establishmentName: 'شركة ومخازن التوحيد لتجارة المواد الغذائية بالجملة',
    ownerName: 'الحاج محمود عبد السلام الشناوي',
    licenseType: 'ترخيص تداول أو توزيع سلعة منظمة',
    competentAuthority: 'وزارة التموين والتجارة الداخلية — قطاع التجارة الداخلية',
    licensedActivityName: 'تجارة السلع الغذائية والاستراتيجية بالجملة',
    issueDate: '2022-01-01',
    expiryDate: '2027-12-31',
    taxCardNumber: '512-741-963',
    taxCardExpiryDate: '2027-12-31',
    commercialRegisterNumber: '88412 محلة',
    commercialRegisterExpiryDate: '2028-04-30',
    status: 'ساري',
    fileNumber: 'ملف-ت/٤١٠٢',
    licenseImage: 'صورة_ترخيص_التوحيد.jpg',
    attachedDocuments: ['موافقة_الدفاع_المدني.pdf', 'الشهادة_الصحية.pdf'],
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    responsibleEmployee: 'أ. خالد محمد الشناوي',
    lastReviewDate: '2026-11-18',
    notes: 'ترخيص ساري ومستوفٍ لكافة الاشتراطات',
  },
  {
    id: 'lic-202',
    licenseNumber: 'ر.م.ع/٢٠١٩/١١٨٥',
    establishmentId: 'est-102',
    establishmentCode: 'TRD-GH-2026-002',
    establishmentName: 'هايبر وسوبر ماركت البركة الحديث',
    ownerName: 'سعيد مصطفى أبو العزم',
    licenseType: 'ترخيص محل تجاري',
    competentAuthority: 'مركز إصدار تراخيص المحال العامة بالوحدة المحلية',
    licensedActivityName: 'سوبر ماركت وبيع المواد الغذائية بالتجزئة',
    issueDate: '2021-12-10',
    expiryDate: '2026-12-08', // يتبقى أقل من 15 يوماً لاختبار تنبيهات التراخيص
    taxCardNumber: '623-852-147',
    taxCardExpiryDate: '2026-11-10',
    commercialRegisterNumber: '91204 محلة',
    commercialRegisterExpiryDate: '2026-12-10',
    status: 'قارب على الانتهاء (١٥ يوماً)',
    fileNumber: 'ملف-ت/٤١٠٩',
    licenseImage: 'صورة_ترخيص_البركة.jpg',
    attachedDocuments: ['عقد_الإيجار_الموثق.pdf'],
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    responsibleEmployee: 'أ. خالد محمد الشناوي',
    lastReviewDate: '2026-11-21',
    notes: 'تم إخطار التاجر بسرعة تجديد الترخيص قبل تاريخ ٢٠٢٦/١٢/٠٨',
  },
  {
    id: 'lic-203',
    licenseNumber: 'ر.م.خ/٢٠٢٠/٩٩٢',
    establishmentId: 'est-104',
    establishmentCode: 'TRD-GH-2026-004',
    establishmentName: 'معرض ومخزن النور للسلع والمنظفات',
    ownerName: 'إبراهيم كمال الدسوقي',
    licenseType: 'ترخيص محل تجاري',
    competentAuthority: 'مركز إصدار تراخيص المحال العامة بالوحدة المحلية',
    licensedActivityName: 'تجارة الزيوت والسمن والمنظفات الصناعية',
    issueDate: '2020-10-01',
    expiryDate: '2026-10-15', // منتهي
    taxCardNumber: '852-147-369',
    taxCardExpiryDate: '2027-11-01',
    commercialRegisterNumber: '93112 محلة',
    commercialRegisterExpiryDate: '2027-11-01',
    status: 'منتهي',
    fileNumber: 'ملف-ت/٤١٢٢',
    licenseImage: 'صورة_ترخيص_النور.jpg',
    attachedDocuments: ['إيصال_رسوم_التفتيش.pdf'],
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    responsibleEmployee: 'أ. خالد محمد الشناوي',
    lastReviewDate: '2026-11-22',
    notes: 'ترخيص منتهي ويستوجب الإنذار وتحصيل رسوم التجديد',
  },
  {
    id: 'lic-204',
    licenseNumber: 'ر.ت.م/٢٠٢٢/٣٣٠١',
    establishmentId: 'est-105',
    establishmentCode: 'TRD-GH-2026-005',
    establishmentName: 'مؤسسة الصفا لتوزيع المواد الغذائية والزيوت',
    ownerName: 'عادل عبد المنعم الشرقاوي',
    licenseType: 'ترخيص مخزن',
    competentAuthority: 'الإدارة الهندسية وتراخيص المحال بالمركز',
    licensedActivityName: 'تجارة السلع الغذائية والاستراتيجية بالجملة',
    issueDate: '2022-01-15',
    expiryDate: '2027-01-10', // قارب على الانتهاء (٦٠ يوماً)
    taxCardNumber: '951-753-852',
    taxCardExpiryDate: '2027-06-15',
    commercialRegisterNumber: '89541 محلة',
    commercialRegisterExpiryDate: '2027-06-15',
    status: 'قارب على الانتهاء (٦٠ يوماً)',
    fileNumber: 'ملف-ت/٤١٣٠',
    licenseImage: 'صورة_ترخيص_الصفا.jpg',
    attachedDocuments: ['شهادة_سلامة_الغذاء.pdf'],
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'البنوان',
    localUnit: 'الوحدة المحلية بالبنوان',
    responsibleEmployee: 'أ. خالد محمد الشناوي',
    lastReviewDate: '2026-11-19',
    notes: 'متابعة التجديد الدوري خلال شهرين',
  },
];

// دليل المخالفات التجارية المعتمد (٦ مجموعات شاملة بالسند القانوني)
export const INITIAL_COMMERCIAL_VIOLATION_CATALOG: CommercialViolationCatalogItem[] = [
  // ١. مخالفات الأسعار والتداول
  { id: 'tvc-01', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'البيع بأزيد من السعر المقرر', legalBasisDecree: 'المرسوم بقانون ١٦٣ لسنة ١٩٥٠ بشأن التسعير الجبري وتعديلاته', competentAuthority: 'النيابة العامة والإدارة التموينية', approvedPenaltyMeasure: 'تحرير محضر جنحة تسعير جبري ومصادرة المضبوطات والغرامة المقررة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 10000, unit: 'سلعة/عبوة', isActive: true },
  { id: 'tvc-02', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'عدم الإعلان عن الأسعار', legalBasisDecree: 'المادة ٩ من القانون ١٦٣ لسنة ١٩٥٠ والقرار الوزاري ٣٣٠ لسنة ٢٠١٧', competentAuthority: 'مديرية التموين والنيابة المختصة', approvedPenaltyMeasure: 'محضر عدم إعلان عن الأسعار وغرامة قانونية', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 3000, unit: 'منشأة', isActive: true },
  { id: 'tvc-03', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'عدم وضع بطاقة السعر', legalBasisDecree: 'القرار الوزاري ٣٣٠ لسنة ٢٠١٧ وقانون حماية المستهلك ١٨١ لسنة ٢٠١٨', competentAuthority: 'إدارة التجارة الداخلية وجهاز حماية المستهلك', approvedPenaltyMeasure: 'تحرير محضر وإلزام المنشأة بوضع بطاقات السعر فوراً', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 2500, unit: 'صنف', isActive: true },
  { id: 'tvc-04', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'الامتناع عن البيع دون مبرر مشروع', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ والمرسوم ١٦٣ لسنة ١٩٥٠', competentAuthority: 'النيابة العامة ومباحث التموين', approvedPenaltyMeasure: 'التحفظ على الكميات الممتنع عن بيعها وعرض المحضر على النيابة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 15000, unit: 'طن/كجم', isActive: true },
  { id: 'tvc-05', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'إخفاء السلع عن التداول', legalBasisDecree: 'المادة ٨ من قانون حماية المستهلك ١٨١ لسنة ٢٠١٨ (سلع استراتيجية)', competentAuthority: 'النيابة العامة ومباحث التموين', approvedPenaltyMeasure: 'ضبط وتحريز كامل الكمية المخفاة وإحالة للنيابة العامة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 50000, unit: 'طن/عبوة', isActive: true },
  { id: 'tvc-06', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'حجب السلع عن المواطنين', legalBasisDecree: 'المادة ٨ و٧١ من القانون ١٨١ لسنة ٢٠١٨ وتعديلات ٢٠٢٣', competentAuthority: 'النيابة العامة', approvedPenaltyMeasure: 'تحفظ فوري على المضبوطات وعرض على النيابة العامة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 50000, unit: 'طن', isActive: true },
  { id: 'tvc-07', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'البيع بسعر مخالف للإعلان', legalBasisDecree: 'قانون حماية المستهلك ١٨١ لسنة ٢٠١٨ المادة ٦', competentAuthority: 'مديرية التموين وحماية المستهلك', approvedPenaltyMeasure: 'تحرير محضر مخالفة السعر المعلن', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 5000, unit: 'واقعة', isActive: true },
  { id: 'tvc-08', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'عدم الالتزام بالتسعير أو القواعد السعرية المطبقة قانوناً', legalBasisDecree: 'قرار مجلس الوزراء بتحديد السلع الاستراتيجية والقرارات الوزارية المنفذة', competentAuthority: 'النيابة العامة ومديرية التموين', approvedPenaltyMeasure: 'ضبط المخالفة والتحفظ على السلعة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 20000, unit: 'صنف', isActive: true },
  { id: 'tvc-09', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'التلاعب في الفواتير', legalBasisDecree: 'القرار الوزاري ١١٣ لسنة ١٩٩٤ وقانون حماية المستهلك', competentAuthority: 'إدارة التجارة الداخلية والنيابة', approvedPenaltyMeasure: 'محضر تلاعب في مستندات وفواتير التداول', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 10000, unit: 'فاتورة', isActive: true },
  { id: 'tvc-10', groupCode: 'أسعار', groupTitle: 'مخالفات الأسعار والتداول', title: 'عدم إصدار فاتورة عند وجوبها', legalBasisDecree: 'المادة ١٠ من القانون ١٨١ لسنة ٢٠١٨', competentAuthority: 'إدارة التجارة الداخلية', approvedPenaltyMeasure: 'تحرير محضر امتناع عن تسليم فاتورة ضريبية/قانونية', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 5000, unit: 'واقعة', isActive: true },

  // ٢. مخالفات الغش التجاري وجودة السلع
  { id: 'tvc-11', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'تداول سلع مجهولة المصدر', legalBasisDecree: 'القرار الوزاري ١١٣ لسنة ١٩٩٤ بشأن حظر تداول السلع مجهولة المصدر', competentAuthority: 'النيابة العامة ومباحث التموين', approvedPenaltyMeasure: 'ضبط وتحفظ على كامل الكمية بدون فواتير وعرض على النيابة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 15000, unit: 'كجم/عبوة', isActive: true },
  { id: 'tvc-12', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'تداول سلع مغشوشة', legalBasisDecree: 'القانون ٤٨ لسنة ١٩٤١ بقمع التدليس والغش وتعديله بالقانون ٢٨١ لسنة ١٩٩٤', competentAuthority: 'النيابة العامة', approvedPenaltyMeasure: 'تحريز المضبوطات وسحب عينات للمعامل المركزية والإحالة للنيابة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 25000, unit: 'كجم/لتر', isActive: true },
  { id: 'tvc-13', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'تداول سلع غير مطابقة للمواصفات', legalBasisDecree: 'القانون ٢٨١ لسنة ١٩٩٤ والقرار الوزاري ١١٣ لسنة ١٩٩٤', competentAuthority: 'النيابة العامة وهيئة المواصفات والجودة', approvedPenaltyMeasure: 'التحفظ على السلعة وإرسال عينة للفحص المعملي', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 15000, unit: 'عبوة', isActive: true },
  { id: 'tvc-14', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'تغيير بيانات العبوات', legalBasisDecree: 'القانون ٤٨ لسنة ١٩٤١ بشأن قمع الغش والتدليس', competentAuthority: 'النيابة العامة', approvedPenaltyMeasure: 'ضبط العبوات والأدوات المستخدمة وإحالة للنيابة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 20000, unit: 'عبوة', isActive: true },
  { id: 'tvc-15', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'التلاعب في تاريخ الصلاحية', legalBasisDecree: 'القانون ٢٨١ لسنة ١٩٩٤ وقانون سلامة الغذاء', competentAuthority: 'النيابة العامة وهيئة سلامة الغذاء', approvedPenaltyMeasure: 'تحفظ فوري على المضبوطات وإحالة عاجلة للنيابة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 30000, unit: 'عبوة', isActive: true },
  { id: 'tvc-16', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'تداول سلع منتهية الصلاحية', legalBasisDecree: 'القانون ٤٨ لسنة ١٩٤١ والقانون ١٠ لسنة ١٩٦٦ بشأن مراقبة الأغذية', competentAuthority: 'النيابة العامة ومفتش الأغذية والتموين', approvedPenaltyMeasure: 'تحريز الكميات المنتهية الصلاحية واستصدار قرار إعدام من النيابة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 25000, unit: 'كجم/كرتونة', isActive: true },
  { id: 'tvc-17', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'الغش في الوزن أو الكيل أو العدد', legalBasisDecree: 'القانون ٤٨ لسنة ١٩٤١ وقانون الموازين والمقاييس ١ لسنة ١٩٩٤', competentAuthority: 'النيابة العامة ومصلحة دمغ المصوغات والموازين', approvedPenaltyMeasure: 'محضر غش في الوزن/الكيل والتحفظ على الميزان غير القانوني', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 10000, unit: 'واقعة', isActive: true },
  { id: 'tvc-18', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'إعادة تعبئة السلع بالمخالفة للقواعد', legalBasisDecree: 'القرار الوزاري ١١٣ لسنة ١٩٩٤ والقانون ٢٨١ لسنة ١٩٩٤', competentAuthority: 'النيابة العامة', approvedPenaltyMeasure: 'ضبط خط التعبئة والكميات المعاد تعبئتها', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 20000, unit: 'طن/عبوة', isActive: true },
  { id: 'tvc-19', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'تقليد العلامات التجارية', legalBasisDecree: 'قانون حماية الملكية الفكرية ٨٢ لسنة ٢٠٠٢ المادة ١١٣', competentAuthority: 'النيابة العامة وإدارة العلامات التجارية', approvedPenaltyMeasure: 'ضبط المنتجات المقلدة وإحالة للنيابة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 25000, unit: 'عبوة', isActive: true },
  { id: 'tvc-20', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'تداول منتجات غير صالحة للاستهلاك', legalBasisDecree: 'القانون ١٠ لسنة ١٩٦٦ والقانون ٢٨١ لسنة ١٩٩٤', competentAuthority: 'النيابة العامة ولجنة سلامة الغذاء', approvedPenaltyMeasure: 'تحفظ كامل واستصدار قرار إعدام رسمي', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 35000, unit: 'كجم', isActive: true },
  { id: 'tvc-21', groupCode: 'غش', groupTitle: 'مخالفات الغش التجاري وجودة السلع', title: 'خلط سلع جيدة بسلع غير مطابقة', legalBasisDecree: 'القانون ٤٨ لسنة ١٩٤١ بشأن قمع التدليس والغش', competentAuthority: 'النيابة العامة', approvedPenaltyMeasure: 'التحفظ على الكمية المخلوطة وسحب عينات معملية', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 20000, unit: 'طن/كجم', isActive: true },

  // ٣. مخالفات التخزين والتداول
  { id: 'tvc-22', groupCode: 'تخزين', groupTitle: 'مخالفات التخزين والتداول', title: 'التخزين في أماكن غير مستوفية للاشتراطات', legalBasisDecree: 'القانون ١٠ لسنة ١٩٦٦ وقانون المحال العامة ١٥٤ لسنة ٢٠١٩', competentAuthority: 'مديرية التموين والوحدة المحلية', approvedPenaltyMeasure: 'محضر مخالفة اشتراطات التخزين وإنذار بتوفيق الأوضاع', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 5000, unit: 'مخزن', isActive: true },
  { id: 'tvc-23', groupCode: 'تخزين', groupTitle: 'مخالفات التخزين والتداول', title: 'سوء التخزين', legalBasisDecree: 'القانون ١٠ لسنة ١٩٦٦ بشأن مراقبة الأغذية', competentAuthority: 'مديرية التموين ومفتش الأغذية', approvedPenaltyMeasure: 'فحص صلاحية السلع المخزنة وتحرير محضر سوء تخزين', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 5000, unit: 'مخزن', isActive: true },
  { id: 'tvc-24', groupCode: 'تخزين', groupTitle: 'مخالفات التخزين والتداول', title: 'عدم توافر شروط الحفظ', legalBasisDecree: 'قرارات الهيئة القومية لسلامة الغذاء والقانون ١٠ لسنة ١٩٦٦', competentAuthority: 'مديرية التموين وسلامة الغذاء', approvedPenaltyMeasure: 'تحرير محضر والتحفظ على السلع المتأثرة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 6000, unit: 'ثلاجة/مخزن', isActive: true },
  { id: 'tvc-25', groupCode: 'تخزين', groupTitle: 'مخالفات التخزين والتداول', title: 'عدم الفصل بين السلع', legalBasisDecree: 'الاشتراطات الصحية والتموينية للمخازن والمحال', competentAuthority: 'إدارة التجارة الداخلية', approvedPenaltyMeasure: 'تحرير محضر وإلزام بالفصل الفوري بين المنظفات والأغذية', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 3000, unit: 'منشأة', isActive: true },
  { id: 'tvc-26', groupCode: 'تخزين', groupTitle: 'مخالفات التخزين والتداول', title: 'تخزين سلع مجهولة المصدر', legalBasisDecree: 'القرار الوزاري ١١٣ لسنة ١٩٩٤', competentAuthority: 'النيابة العامة', approvedPenaltyMeasure: 'تحريز كامل الكميات المخزنة بدون فواتير', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 15000, unit: 'طن/كرتونة', isActive: true },
  { id: 'tvc-27', groupCode: 'تخزين', groupTitle: 'مخالفات التخزين والتداول', title: 'عدم وجود مستندات تداول', legalBasisDecree: 'القرار الوزاري ١١٣ لسنة ١٩٩٤', competentAuthority: 'إدارة التجارة الداخلية والنيابة', approvedPenaltyMeasure: 'تحرير محضر والتحفظ على البضاعة لحين تقديم الفواتير', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 10000, unit: 'شحنة', isActive: true },
  { id: 'tvc-28', groupCode: 'تخزين', groupTitle: 'مخالفات التخزين والتداول', title: 'عدم إثبات الوارد والمنصرف', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ والقرارات المنظمة للمخازن', competentAuthority: 'إدارة التجارة الداخلية', approvedPenaltyMeasure: 'محضر عدم انتظام سجلات الوارد والمنصرف', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 4000, unit: 'سجل', isActive: true },
  { id: 'tvc-29', groupCode: 'تخزين', groupTitle: 'مخالفات التخزين والتداول', title: 'تداول سلعة خارج القنوات المقررة', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ بشأن شؤون التموين', competentAuthority: 'النيابة العامة ومديرية التموين', approvedPenaltyMeasure: 'ضبط السلعة وتحرير محضر تصرف خارج القنوات الرسمية', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 20000, unit: 'طن', isActive: true },
  { id: 'tvc-30', groupCode: 'تخزين', groupTitle: 'مخالفات التخزين والتداول', title: 'التصرف في السلع بالمخالفة للقرارات المنظمة', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥', competentAuthority: 'النيابة العامة ومديرية التموين', approvedPenaltyMeasure: 'تحصيل فروق الأسعار وإحالة المحضر للنيابة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 25000, unit: 'طن', isActive: true },

  // ٤. مخالفات التراخيص والسجلات
  { id: 'tvc-31', groupCode: 'تراخيص', groupTitle: 'مخالفات التراخيص والسجلات', title: 'مزاولة نشاط دون الترخيص المطلوب', legalBasisDecree: 'قانون المحال العامة رقم ١٥٤ لسنة ٢٠١٩ المادة ٣٠', competentAuthority: 'النيابة العامة ومركز تراخيص المحال العامة', approvedPenaltyMeasure: 'محضر إدارة منشأة بدون ترخيص وإخطار الوحدة المحلية للغلق الإداري', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 20000, unit: 'منشأة', isActive: true },
  { id: 'tvc-32', groupCode: 'تراخيص', groupTitle: 'مخالفات التراخيص والسجلات', title: 'ممارسة نشاط مخالف للترخيص', legalBasisDecree: 'قانون المحال العامة ١٥٤ لسنة ٢٠١٩ المادة ١١ و٣١', competentAuthority: 'مركز التراخيص ومديرية التموين', approvedPenaltyMeasure: 'تحرير محضر تغيير أو إضافة نشاط بدون موافقة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 10000, unit: 'منشأة', isActive: true },
  { id: 'tvc-33', groupCode: 'تراخيص', groupTitle: 'مخالفات التراخيص والسجلات', title: 'انتهاء الترخيص', legalBasisDecree: 'القوانين المنظمة للتراخيص التجارية والتموينية', competentAuthority: 'الجهة المصدرة للترخيص ومديرية التموين', approvedPenaltyMeasure: 'محضر تسيير نشاط بترخيص منتهي وإلزام بالتجديد', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 5000, unit: 'ترخيص', isActive: true },
  { id: 'tvc-34', groupCode: 'تراخيص', groupTitle: 'مخالفات التراخيص والسجلات', title: 'عدم تقديم المستندات المطلوبة', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ وقانون السجل التجاري ٣٤ لسنة ١٩٧٦', competentAuthority: 'إدارة التجارة الداخلية', approvedPenaltyMeasure: 'تحرير محضر عدم تقديم المستندات التموينية والتجارية', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 3000, unit: 'منشأة', isActive: true },
  { id: 'tvc-35', groupCode: 'تراخيص', groupTitle: 'مخالفات التراخيص والسجلات', title: 'عدم الالتزام بالاشتراطات', legalBasisDecree: 'قانون المحال العامة ١٥٤ لسنة ٢٠١٩ والقرارات التموينية', competentAuthority: 'مديرية التموين والوحدة المحلية', approvedPenaltyMeasure: 'محضر مخالفة اشتراطات التشغيل والمهلة القانونية', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 4000, unit: 'منشأة', isActive: true },
  { id: 'tvc-36', groupCode: 'تراخيص', groupTitle: 'مخالفات التراخيص والسجلات', title: 'عدم وجود السجلات الإلزامية', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ والقرارات الوزارية المنفذة', competentAuthority: 'إدارة التجارة الداخلية', approvedPenaltyMeasure: 'تحرير محضر عدم إمساك السجلات التموينية المقررة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 5000, unit: 'سجل', isActive: true },
  { id: 'tvc-37', groupCode: 'تراخيص', groupTitle: 'مخالفات التراخيص والسجلات', title: 'عدم انتظام الفواتير والسجلات', legalBasisDecree: 'القرار الوزاري ١١٣ لسنة ١٩٩٤', competentAuthority: 'إدارة التجارة الداخلية', approvedPenaltyMeasure: 'محضر عدم انتظام القيد بالسجلات والفواتير', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 4000, unit: 'منشأة', isActive: true },
  { id: 'tvc-38', groupCode: 'تراخيص', groupTitle: 'مخالفات التراخيص والسجلات', title: 'عدم تحديث بيانات المنشأة', legalBasisDecree: 'قانون السجل التجاري رقم ٣٤ لسنة ١٩٧٦', competentAuthority: 'مكتب السجل التجاري وإدارة التجارة الداخلية', approvedPenaltyMeasure: 'محضر عدم التأشير بتحديث البيانات في السجل التجاري', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 2000, unit: 'منشأة', isActive: true },

  // ٥. مخالفات الأوكازيون والتخفيضات
  { id: 'tvc-39', groupCode: 'أوكازيون', groupTitle: 'مخالفات الأوكازيون والتخفيضات', title: 'إعلان تخفيضات دون التصاريح المطلوبة', legalBasisDecree: 'القرار الوزاري المنظم للأوكازيون الموسمي وقانون حماية المستهلك', competentAuthority: 'مديرية التموين والتجارة الداخلية', approvedPenaltyMeasure: 'تحرير محضر المشاركة في الأوكازيون بدون تصريح رسمي من المديرية', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 10000, unit: 'محل', isActive: true },
  { id: 'tvc-40', groupCode: 'أوكازيون', groupTitle: 'مخالفات الأوكازيون والتخفيضات', title: 'تخفيضات وهمية', legalBasisDecree: 'المادة ٩ و٦٦ من قانون حماية المستهلك ١٨١ لسنة ٢٠١٨', competentAuthority: 'النيابة العامة وجهاز حماية المستهلك ومديرية التموين', approvedPenaltyMeasure: 'محضر إعلان تخفيضات وهمية وتضليل المستهلكين', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 50000, unit: 'محل', isActive: true },
  { id: 'tvc-41', groupCode: 'أوكازيون', groupTitle: 'مخالفات الأوكازيون والتخفيضات', title: 'عدم الالتزام بنسبة التخفيض المعلنة', legalBasisDecree: 'قانون حماية المستهلك ١٨١ لسنة ٢٠١٨ والقرار الوزاري للأوكازيون', competentAuthority: 'إدارة التجارة الداخلية', approvedPenaltyMeasure: 'تحرير محضر مخالفة نسبة الخصم المعلنة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 15000, unit: 'محل', isActive: true },
  { id: 'tvc-42', groupCode: 'أوكازيون', groupTitle: 'مخالفات الأوكازيون والتخفيضات', title: 'عدم توضيح السعر قبل التخفيض وبعده', legalBasisDecree: 'ضوابط القرار الوزاري المنظم للتصفية الموسمية (الأوكازيون)', competentAuthority: 'إدارة التجارة الداخلية', approvedPenaltyMeasure: 'تحرير محضر عدم إثبات السعر السابق والحالي على بطاقة السعر', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 5000, unit: 'محل', isActive: true },
  { id: 'tvc-43', groupCode: 'أوكازيون', groupTitle: 'مخالفات الأوكازيون والتخفيضات', title: 'الإعلان عن عروض مضللة', legalBasisDecree: 'المادة ٩ من القانون ١٨١ لسنة ٢٠١٨ بشأن السلوك الخادع', competentAuthority: 'النيابة العامة وحماية المستهلك', approvedPenaltyMeasure: 'محضر إعلان خادع ومضلل للمواطنين', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 30000, unit: 'واقعة', isActive: true },
  { id: 'tvc-44', groupCode: 'أوكازيون', groupTitle: 'مخالفات الأوكازيون والتخفيضات', title: 'عدم الاحتفاظ بالمستندات المطلوبة', legalBasisDecree: 'القرار الوزاري المنظم للأوكازيون (فواتير البيع للشهر السابق)', competentAuthority: 'إدارة التجارة الداخلية', approvedPenaltyMeasure: 'محضر عدم تقديم بونات وفواتير البيع السابقة على الأوكازيون', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 5000, unit: 'محل', isActive: true },

  // ٦. مخالفات تداول السلع التموينية والمنظمة (والبوتاجاز والمواد البترولية)
  { id: 'tvc-45', groupCode: 'تموينية', groupTitle: 'مخالفات تداول السلع التموينية والمنظمة', title: 'التصرف في سلع مدعمة بالمخالفة للقواعد', legalBasisDecree: 'المادة ٣ مكرر (ب) من المرسوم بقانون ٩٥ لسنة ١٩٤٥', competentAuthority: 'النيابة العامة ومديرية التموين', approvedPenaltyMeasure: 'تحرير محضر تصرف وتحصيل ضعف قيمة السلع المدعمة المتصرف فيها', hasAutomaticFinancialFine: true, defaultBaseFineEgp: 25000, unit: 'طن/أسطوانة/لتر', isActive: true },
  { id: 'tvc-46', groupCode: 'تموينية', groupTitle: 'مخالفات تداول السلع التموينية والمنظمة', title: 'تجميع السلع التموينية', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ بشأن شؤون التموين', competentAuthority: 'النيابة العامة ومباحث التموين', approvedPenaltyMeasure: 'مصادرة المضبوطات المجمعة وتحرير محضر جنحة تموينية', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 30000, unit: 'طن/لتر', isActive: true },
  { id: 'tvc-47', groupCode: 'تموينية', groupTitle: 'مخالفات تداول السلع التموينية والمنظمة', title: 'بيع السلع المدعمة خارج القنوات المقررة', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ والقرارات الوزارية للبترول والبوتاجاز', competentAuthority: 'النيابة العامة', approvedPenaltyMeasure: 'ضبط الكمية وتحصيل فروق الدعم وإحالة للنيابة', hasAutomaticFinancialFine: true, defaultBaseFineEgp: 20000, unit: 'أسطوانة/لتر', isActive: true },
  { id: 'tvc-48', groupCode: 'تموينية', groupTitle: 'مخالفات تداول السلع التموينية والمنظمة', title: 'تهريب السلع', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ (تهريب المواد البترولية والسلع المدعمة)', competentAuthority: 'النيابة العامة ومباحث التموين', approvedPenaltyMeasure: 'ضبط وسيلة النقل والمضبوطات وإحالة فورية للنيابة العامة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 50000, unit: 'طن/لتر', isActive: true },
  { id: 'tvc-49', groupCode: 'تموينية', groupTitle: 'مخالفات تداول السلع التموينية والمنظمة', title: 'حجب السلع', legalBasisDecree: 'المادة ٣ مكرر من المرسوم بقانون ٩٥ لسنة ١٩٤٥', competentAuthority: 'النيابة العامة', approvedPenaltyMeasure: 'التحفظ على الكميات المحجوبة وبيعها تحت إشراف التموين بأمر النيابة', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 35000, unit: 'طن/أسطوانة', isActive: true },
  { id: 'tvc-50', groupCode: 'تموينية', groupTitle: 'مخالفات تداول السلع التموينية والمنظمة', title: 'التلاعب في مستندات الصرف والتوزيع', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ والقرار الوزاري ١٠٢ لسنة ٢٠١١ (سجل ٢١ بترول)', competentAuthority: 'النيابة العامة وإدارة المواد البترولية', approvedPenaltyMeasure: 'محضر تلاعب في سجل ٢١ بترول / دفاتر البوتاجاز', hasAutomaticFinancialFine: false, defaultBaseFineEgp: 15000, unit: 'سجل', isActive: true },
  { id: 'tvc-51', groupCode: 'تموينية', groupTitle: 'مخالفات تداول السلع التموينية والمنظمة', title: 'التلاعب في كميات الاستلام والتسليم', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥', competentAuthority: 'مديرية التموين والنيابة العامة', approvedPenaltyMeasure: 'جرد فعلي للمحطة أو المستودع وتحصيل فروق العجز أو الزيادة', hasAutomaticFinancialFine: true, defaultBaseFineEgp: 22000, unit: 'لتر/أسطوانة', isActive: true },
];

export const INITIAL_TRADE_CAMPAIGNS: TradeInspectionCampaignRecord[] = [
  {
    id: 'cmp-301',
    campaignNumber: 'CMP-TRD-2026-014',
    campaignDate: '2026-11-21',
    startTime: '09:00',
    endTime: '15:30',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    campaignScope: 'أسواق ومخازن قرى الهياتم وصفط تراب ومحلة أبو علي',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    targetStreetsAndAreas: 'الشارع العمومي بالهياتم، شارع البحر بصفط تراب، منطقة المخازن بمحلة أبو علي',
    campaignType: 'حملات متابعة الأسواق',
    campaignLeader: 'أ. خالد محمد الشناوي',
    campaignMembers: ['مفتش/ سامي عبد القادر', 'مفتش/ طارق أبو زيد', 'مفتش/ وائل الجوهري'],
    participatingAuthorities: ['إدارة تموين مركز المحلة الكبرى', 'مباحث التموين بالغربية', 'هيئة سلامة الغذاء'],
    targetedEstablishmentsCount: 18,
    inspectedEstablishmentsCount: 16,
    violationsCount: 4,
    reportsCount: 2,
    seizuresCount: 2,
    status: 'منفذة',
    resultSummary: 'تحرير محضري جنح تموينية (تداول أعلاف وزيوت مجهولة المصدر + مزاولة نشاط بدون ترخيص وعدم إعلان أسعار) وضبط ٢٫٥ طن أعلاف و٤٠٠ لتر زيت طعام',
    notes: 'تم تسليم المحاضر والمضبوطات وفق الإجراءات القانونية',
    attachments: ['تقرير_الحملة_CMP_014.pdf'],
  },
  {
    id: 'cmp-302',
    campaignNumber: 'CMP-TRD-2026-015',
    campaignDate: '2026-11-24',
    startTime: '10:00',
    endTime: '16:00',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    campaignScope: 'محطات الوقود ومستودعات البوتاجاز بقرى بشبيش والبنوان',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    targetStreetsAndAreas: 'طريق بشبيش الرئيسي، منطقة المستودعات بالبنوان',
    campaignType: 'حملات متابعة محطات الوقود',
    campaignLeader: 'أ. خالد محمد الشناوي',
    campaignMembers: ['مفتش/ ياسر الشهاوي', 'مفتش/ هاني عبد اللطيف'],
    participatingAuthorities: ['إدارة تموين مركز المحلة الكبرى', 'مصلحة دمغ المصوغات والموازين'],
    targetedEstablishmentsCount: 10,
    inspectedEstablishmentsCount: 8,
    violationsCount: 2,
    reportsCount: 1,
    seizuresCount: 1,
    status: 'جاري تنفيذها',
    resultSummary: 'جرد سجل ٢١ بترول بمحطات الوقود وضبط تلاعب في كميات السولار وتحرير محضر رسمي',
    notes: 'جاري استكمال فحص باقي الموزعين التابعين لمستودع بشبيش',
    attachments: ['محضر_جرد_المحطات_015.pdf'],
  },
];

export const INITIAL_COMMERCIAL_VIOLATION_REPORTS: CommercialViolationReportRecord[] = [
  {
    id: 'cvr-401',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٤٢',
    campaignId: 'cmp-301',
    campaignNumber: 'CMP-TRD-2026-014',
    reportDate: '2026-11-21',
    reportTime: '12:15',
    establishmentId: 'est-103',
    establishmentCode: 'TRD-GH-2026-003',
    establishmentName: 'مخازن الدلتا للأعلاف والحبوب والغلال',
    ownerName: 'عبد الفتاح السيد الجمل',
    activityType: 'تخزين وتعبئة الحبوب والغلال والأعلاف',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    issuingAuthority: 'إدارة تموين مركز المحلة الكبرى بالاشتراك مع مباحث التموين',
    inspectorName: 'مفتش/ سامي عبد القادر',
    competentCaseNumber: '١٨٤٢٠ جنح مركز المحلة ٢٠٢٦',
    items: [
      {
        id: 'cvi-1',
        catalogId: 'tvc-11',
        groupTitle: 'مخالفات الغش التجاري وجودة السلع',
        violationTitle: 'تداول سلع مجهولة المصدر',
        detailedDescription: 'حيازة وتخزين ٢٫٥ طن أعلاف داجنة و٤٠٠ لتر زيت طعام بدون فواتير أو مستندات دالة على المصدر',
        seizedQuantity: 2500,
        unit: 'كجم',
        fineAmountEgp: 25000,
        legalBasis: 'القرار الوزاري ١١٣ لسنة ١٩٩٤ بشأن حظر تداول السلع مجهولة المصدر',
        competentAuthority: 'النيابة العامة ومباحث التموين',
        approvedMeasure: 'ضبط وتحفظ على كامل الكمية بدون فواتير وعرض على النيابة',
      },
      {
        id: 'cvi-2',
        catalogId: 'tvc-31',
        groupTitle: 'مخالفات التراخيص والسجلات',
        violationTitle: 'مزاولة نشاط دون الترخيص المطلوب',
        detailedDescription: 'إدارة مخزن أعلاف وتعبئة زيوت بدون ترخيص من الجهة المختصة',
        seizedQuantity: 0,
        unit: 'منشأة',
        fineAmountEgp: 20000,
        legalBasis: 'قانون المحال العامة رقم ١٥٤ لسنة ٢٠١٩ المادة ٣٠',
        competentAuthority: 'النيابة العامة ومركز تراخيص المحال العامة',
        approvedMeasure: 'محضر إدارة منشأة بدون ترخيص وإخطار الوحدة المحلية للغلق الإداري',
      },
    ],
    totalSeizedQuantitySummary: '٢٥٠٠ كجم أعلاف + ٤٠٠ لتر زيت طعام',
    totalFineAmountEgp: 45000,
    legalBasisSummary: 'القرار الوزاري ١١٣ لسنة ١٩٩٤ + قانون المحال العامة ١٥٤ لسنة ٢٠١٩',
    reportStatus: 'معروض على النيابة',
    isSettled: false,
    attachments: ['صورة_المحضر_1142.pdf', 'محضر_التحفظ_1142.pdf'],
    notes: 'تم التحفظ على المضبوطات لحين صدور قرار النيابة العامة',
  },
  {
    id: 'cvr-402',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٤٨',
    campaignId: 'cmp-301',
    campaignNumber: 'CMP-TRD-2026-014',
    reportDate: '2026-11-21',
    reportTime: '14:00',
    establishmentId: 'est-102',
    establishmentCode: 'TRD-GH-2026-002',
    establishmentName: 'هايبر وسوبر ماركت البركة الحديث',
    ownerName: 'سعيد مصطفى أبو العزم',
    activityType: 'سوبر ماركت وبيع المواد الغذائية بالتجزئة',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    issuingAuthority: 'إدارة تموين مركز المحلة الكبرى',
    inspectorName: 'مفتش/ طارق أبو زيد',
    competentCaseNumber: '١٨٤٥٥ جنح مركز المحلة ٢٠٢٦',
    items: [
      {
        id: 'cvi-3',
        catalogId: 'tvc-02',
        groupTitle: 'مخالفات الأسعار والتداول',
        violationTitle: 'عدم الإعلان عن الأسعار',
        detailedDescription: 'عدم الإعلان عن أسعار السلع الغذائية المعروضة بقسم الألبان والزيوت',
        seizedQuantity: 0,
        unit: 'منشأة',
        fineAmountEgp: 5000,
        legalBasis: 'المادة ٩ من القانون ١٦٣ لسنة ١٩٥٠ والقرار الوزاري ٣٣٠ لسنة ٢٠١٧',
        competentAuthority: 'مديرية التموين والنيابة المختصة',
        approvedMeasure: 'محضر عدم إعلان عن الأسعار وغرامة قانونية',
      },
    ],
    totalSeizedQuantitySummary: 'لا توجد مضبوطات عينية',
    totalFineAmountEgp: 5000,
    legalBasisSummary: 'القانون ١٦٣ لسنة ١٩٥٠ والقرار ٣٣٠ لسنة ٢٠١٧',
    reportStatus: 'متصالح',
    isSettled: true,
    attachments: ['صورة_المحضر_1148.pdf', 'إيصال_التصالح_1148.pdf'],
    notes: 'تم سداد مبلغ التصالح المعتمد بالكامل وإغلاق المحضر قانونياً',
  },
  {
    id: 'cvr-403',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٦٠',
    campaignId: 'cmp-302',
    campaignNumber: 'CMP-TRD-2026-015',
    reportDate: '2026-11-24',
    reportTime: '13:20',
    establishmentId: 'est-104',
    establishmentCode: 'TRD-GH-2026-004',
    establishmentName: 'معرض ومخزن النور للسلع والمنظفات',
    ownerName: 'إبراهيم كمال الدسوقي',
    activityType: 'تجارة الزيوت والسمن والمنظفات الصناعية',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    issuingAuthority: 'إدارة تموين مركز المحلة الكبرى',
    inspectorName: 'مفتش/ ياسر الشهاوي',
    competentCaseNumber: '١٨٥١٠ جنح مركز المحلة ٢٠٢٦',
    items: [
      {
        id: 'cvi-4',
        catalogId: 'tvc-33',
        groupTitle: 'مخالفات التراخيص والسجلات',
        violationTitle: 'انتهاء الترخيص',
        detailedDescription: 'تسيير نشاط المحل التجاري بترخيص منتهي الصلاحية منذ ٢٠٢٦/١٠/١٥',
        seizedQuantity: 0,
        unit: 'ترخيص',
        fineAmountEgp: 5000,
        legalBasis: 'قانون المحال العامة ١٥٤ لسنة ٢٠١٩',
        competentAuthority: 'مركز التراخيص ومديرية التموين',
        approvedMeasure: 'محضر تسيير نشاط بترخيص منتهي وإلزام بالتجديد',
      },
      {
        id: 'cvi-5',
        catalogId: 'tvc-16',
        groupTitle: 'مخالفات الغش التجاري وجودة السلع',
        violationTitle: 'تداول سلع منتهية الصلاحية',
        detailedDescription: 'ضبط ١٢٠ عبوة منظفات ومطهرات منتهية الصلاحية معروضة للبيع',
        seizedQuantity: 120,
        unit: 'عبوة',
        fineAmountEgp: 15000,
        legalBasis: 'القانون ٤٨ لسنة ١٩٤١ بشأن قمع الغش والتدليس',
        competentAuthority: 'النيابة العامة',
        approvedMeasure: 'تحريز الكميات المنتهية الصلاحية واستصدار قرار إعدام من النيابة',
      },
    ],
    totalSeizedQuantitySummary: '١٢٠ عبوة منظفات ومطهرات',
    totalFineAmountEgp: 20000,
    legalBasisSummary: 'القانون ٤٨ لسنة ١٩٤١ + القانون ١٥٤ لسنة ٢٠١٩',
    reportStatus: 'معتمد',
    isSettled: false,
    attachments: ['صورة_المحضر_1160.pdf'],
    notes: 'تم التحفظ على العبوات المنتهية الصلاحية',
  },
];

export const INITIAL_COMMERCIAL_SETTLEMENTS: CommercialSettlementRecord[] = [
  {
    id: 'stl-501',
    reportId: 'cvr-402',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٤٨',
    settlementRequestNumber: 'طلب-تصالح/٢٠٢٦/٣٠١',
    establishmentId: 'est-102',
    establishmentName: 'هايبر وسوبر ماركت البركة الحديث',
    traderName: 'سعيد مصطفى أبو العزم',
    violationTypeSummary: 'عدم الإعلان عن الأسعار',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    dueAmountEgp: 5000,
    approvedSettlementAmountEgp: 5000,
    requestDate: '2026-11-22',
    approvalDate: '2026-11-23',
    competentAuthority: 'النيابة العامة ولجنة التصالحات التموينية',
    status: 'تم السداد',
    paymentReceiptNumber: 'إيصال-حكومي-٩٩٤١٢٠',
    paymentDate: '2026-11-23',
    paidAmountEgp: 5000,
    remainingAmountEgp: 0,
    documents: ['إيصال_السداد_994120.pdf', 'قرار_قبول_التصالح.pdf'],
    approvedBy: 'أ. خالد محمد الشناوي',
    notes: 'تم السداد الكامل بموجب إيصال رسمي وإغلاق المحضر',
  },
  {
    id: 'stl-502',
    reportId: 'cvr-403',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٦٠',
    settlementRequestNumber: 'طلب-تصالح/٢٠٢٦/٣٠٩',
    establishmentId: 'est-104',
    establishmentName: 'معرض ومخزن النور للسلع والمنظفات',
    traderName: 'إبراهيم كمال الدسوقي',
    violationTypeSummary: 'انتهاء الترخيص + تداول سلع منتهية الصلاحية',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    dueAmountEgp: 20000,
    approvedSettlementAmountEgp: 15000,
    requestDate: '2026-11-24',
    approvalDate: '2026-11-25',
    competentAuthority: 'لجنة التصالحات التموينية والنيابة المختصة',
    status: 'تصالح جزئي',
    paymentReceiptNumber: 'إيصال-حكومي-٩٩٤٣٠٥',
    paymentDate: '2026-11-25',
    paidAmountEgp: 7500,
    remainingAmountEgp: 7500,
    documents: ['طلب_التصالح_309.pdf'],
    approvedBy: 'أ. خالد محمد الشناوي',
    notes: 'تم سداد دفعة أولى ٧٥٠٠ ج.م عن شق الترخيص وبانتظار قرار النيابة في المضبوطات',
  },
];

export const INITIAL_COMMERCIAL_SEIZURES: CommercialSeizureRecord[] = [
  {
    id: 'sz-601',
    seizureNumber: 'SZ-2026-081',
    reportId: 'cvr-401',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٤٢',
    campaignId: 'cmp-301',
    campaignNumber: 'CMP-TRD-2026-014',
    seizureDate: '2026-11-21',
    establishmentId: 'est-103',
    establishmentName: 'مخازن الدلتا للأعلاف والحبوب والغلال',
    traderName: 'عبد الفتاح السيد الجمل',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    commodityCategory: 'الأعلاف والحبوب',
    productName: 'علف دواجن بادئ نامي ٢٣٪ بروتين',
    brandName: 'بدون علامة تجارية مسجلة',
    initialQuantity: 2500,
    currentActualBalance: 2500,
    unit: 'كجم',
    weightOrVolume: '٥٠ شيكارة × ٥٠ كجم',
    estimatedValueEgp: 62500,
    commodityCondition: 'مجهولة المصدر',
    seizureReason: 'عدم وجود فواتير ضريبية أو رقم تسجيل بوزارة الزراعة',
    seizureLocation: 'مخزن المنشأة بقرية محلة أبو علي',
    custodyLocation: 'مخزن التحفظات المركزي بإدارة تموين المحلة',
    custodyAuthority: 'إدارة تموين مركز المحلة الكبرى',
    custodianName: 'أمين العهدة/ مصطفى كامل عبد ربه',
    inventoryReportNumber: 'جرد-مضبوطات/٢٠٢٦/٨١',
    photos: ['صورة_مضبوطات_الأعلاف_081.jpg'],
    documents: ['محضر_التحفظ_والجرد_081.pdf'],
    legalStatus: 'بانتظار قرار النيابة',
    custodyExpiryDate: '2026-12-21',
  },
  {
    id: 'sz-602',
    seizureNumber: 'SZ-2026-082',
    reportId: 'cvr-401',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٤٢',
    campaignId: 'cmp-301',
    campaignNumber: 'CMP-TRD-2026-014',
    seizureDate: '2026-11-21',
    establishmentId: 'est-103',
    establishmentName: 'مخازن الدلتا للأعلاف والحبوب والغلال',
    traderName: 'عبد الفتاح السيد الجمل',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    commodityCategory: 'الزيت',
    productName: 'زيت طعام خليط معبأ في جراكن غير مدون عليها بيانات',
    brandName: 'سائب بدون بيانات',
    initialQuantity: 400,
    currentActualBalance: 400,
    unit: 'لتر',
    weightOrVolume: '٢٠ جركن × ٢٠ لتر',
    estimatedValueEgp: 24000,
    commodityCondition: 'مشتبه في صلاحيتها',
    seizureReason: 'تعبئة وتخزين زيت طعام مجهول المصدر بدون ترخيص',
    seizureLocation: 'مخزن المنشأة بقرية محلة أبو علي',
    custodyLocation: 'مخزن التحفظات المركزي بإدارة تموين المحلة',
    custodyAuthority: 'إدارة تموين مركز المحلة الكبرى',
    custodianName: 'أمين العهدة/ مصطفى كامل عبد ربه',
    inventoryReportNumber: 'جرد-مضبوطات/٢٠٢٦/٨٢',
    photos: ['صورة_جراكن_الزيت_082.jpg'],
    documents: ['محضر_سحب_عينات_الزيت_082.pdf'],
    legalStatus: 'تحت التحفظ',
    custodyExpiryDate: '2026-12-15',
  },
  {
    id: 'sz-603',
    seizureNumber: 'SZ-2026-085',
    reportId: 'cvr-403',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٦٠',
    campaignId: 'cmp-302',
    campaignNumber: 'CMP-TRD-2026-015',
    seizureDate: '2026-11-24',
    establishmentId: 'est-104',
    establishmentName: 'معرض ومخزن النور للسلع والمنظفات',
    traderName: 'إبراهيم كمال الدسوقي',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    commodityCategory: 'المنظفات',
    productName: 'منظفات ومطهرات سائلة منتهية الصلاحية',
    brandName: 'كلين فورس',
    initialQuantity: 120,
    currentActualBalance: 120,
    unit: 'عبوة',
    weightOrVolume: '١٢٠ عبوة × ١ لتر',
    estimatedValueEgp: 5400,
    commodityCondition: 'منتهية الصلاحية',
    seizureReason: 'انتهاء تاريخ الصلاحية المدون على العبوات',
    seizureLocation: 'معرض النور بقرية بشبيش',
    custodyLocation: 'غرفة التحفظ بمقر وحدة تموين بشبيش',
    custodyAuthority: 'إدارة تموين مركز المحلة الكبرى',
    custodianName: 'أمين العهدة/ أشرف عبد المجيد',
    inventoryReportNumber: 'جرد-مضبوطات/٢٠٢٦/٨٥',
    photos: ['صورة_مضبوطات_المنظفات_085.jpg'],
    documents: ['محضر_التحفظ_085.pdf'],
    legalStatus: 'تحت التحفظ',
    custodyExpiryDate: '2026-12-10',
  },
];

export const INITIAL_SEIZURE_MOVEMENTS: SeizureMovementRecord[] = [
  {
    id: 'szm-701',
    movementNumber: 'MV-SZ-2026-001',
    seizureId: 'sz-601',
    seizureNumber: 'SZ-2026-081',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٤٢',
    movementType: 'الاستلام',
    quantity: 2500,
    unit: 'كجم',
    movementDate: '2026-11-21',
    movementTime: '15:00',
    deliveredBy: 'مفتش/ سامي عبد القادر',
    receivedBy: 'أمين العهدة/ مصطفى كامل عبد ربه',
    custodyLocationBefore: 'موقع الضبط بقرية محلة أبو علي',
    custodyLocationAfter: 'مخزن التحفظات المركزي بإدارة تموين المحلة',
    officialDecisionReference: 'محضر الضبط والتحريز رقم ١١٤٢ لسنة ٢٠٢٦',
    isApproved: true,
    approvedBy: 'أ. خالد محمد الشناوي',
    auditTrailNote: 'إيداع أولي للمضبوطات بمخزن التحفظات المركزي',
  },
  {
    id: 'szm-702',
    movementNumber: 'MV-SZ-2026-002',
    seizureId: 'sz-602',
    seizureNumber: 'SZ-2026-082',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٤٢',
    movementType: 'الاستلام',
    quantity: 400,
    unit: 'لتر',
    movementDate: '2026-11-21',
    movementTime: '15:10',
    deliveredBy: 'مفتش/ سامي عبد القادر',
    receivedBy: 'أمين العهدة/ مصطفى كامل عبد ربه',
    custodyLocationBefore: 'موقع الضبط بقرية محلة أبو علي',
    custodyLocationAfter: 'مخزن التحفظات المركزي بإدارة تموين المحلة',
    officialDecisionReference: 'محضر الضبط والتحريز رقم ١١٤٢ لسنة ٢٠٢٦',
    isApproved: true,
    approvedBy: 'أ. خالد محمد الشناوي',
    auditTrailNote: 'إيداع أولي لجراكن الزيت المتحفظ عليها',
  },
  {
    id: 'szm-703',
    movementNumber: 'MV-SZ-2026-003',
    seizureId: 'sz-603',
    seizureNumber: 'SZ-2026-085',
    reportNumber: 'جنحة-ت-٢٠٢٦-١١٦٠',
    movementType: 'الاستلام',
    quantity: 120,
    unit: 'عبوة',
    movementDate: '2026-11-24',
    movementTime: '14:30',
    deliveredBy: 'مفتش/ ياسر الشهاوي',
    receivedBy: 'أمين العهدة/ أشرف عبد المجيد',
    custodyLocationBefore: 'موقع الضبط بقرية بشبيش',
    custodyLocationAfter: 'غرفة التحفظ بمقر وحدة تموين بشبيش',
    officialDecisionReference: 'محضر الضبط رقم ١١٦٠ لسنة ٢٠٢٦',
    isApproved: true,
    approvedBy: 'أ. خالد محمد الشناوي',
    auditTrailNote: 'استلام وتحريز ١٢٠ عبوة منظفات منتهية الصلاحية',
  },
];

export const INITIAL_MARKET_COMMODITIES: MarketCommodityRecord[] = [
  {
    id: 'cmd-01',
    code: 'CMD-RICE-01',
    name: 'أرز أبيض بلدي معبأ عريض الحبة',
    category: 'الأرز',
    unit: 'كجم',
    brandName: 'ساعة / الدلتا',
    countryOfOrigin: 'مصر',
    commodityType: 'غذائية استراتيجية',
    isEssential: true,
    isSubjectToPriceRegulation: true,
    officialReferenceMaxPriceEgp: 30,
    officialPriceDecreeRef: 'قرار مجلس الوزراء بشأن السلع الاستراتيجية السبع ٢٠٢٤/٢٠٢٦',
    officialPriceEffectiveDate: '2026-01-01',
    availabilityStatus: 'متوفر',
    notes: 'سلعة استراتيجية أساسية تخضع للرقابة اليومية',
  },
  {
    id: 'cmd-02',
    code: 'CMD-SUGR-01',
    name: 'سكر أبيض معبأ حر',
    category: 'السكر',
    unit: 'كجم',
    brandName: 'الدلتا للسكر / النيل',
    countryOfOrigin: 'مصر',
    commodityType: 'غذائية استراتيجية',
    isEssential: true,
    isSubjectToPriceRegulation: true,
    officialReferenceMaxPriceEgp: 27,
    officialPriceDecreeRef: 'قرار وزير التموين والتجارة الداخلية لتنظيم تداول السكر الحر والمبادرة',
    officialPriceEffectiveDate: '2026-01-01',
    availabilityStatus: 'متوفر بكميات محدودة',
    notes: 'متابعة يومية لضخ الكميات بالمنافذ والسوبر ماركت',
  },
  {
    id: 'cmd-03',
    code: 'CMD-OIL-01',
    name: 'زيت طعام خليط معبأ ١ لتر',
    category: 'الزيت',
    unit: 'لتر',
    brandName: 'هدية / قلية / طنطا للزيوت',
    countryOfOrigin: 'مصر',
    commodityType: 'غذائية استراتيجية',
    isEssential: true,
    isSubjectToPriceRegulation: true,
    officialReferenceMaxPriceEgp: 65,
    officialPriceDecreeRef: 'قرار مجلس الوزراء للسلع الاستراتيجية',
    officialPriceEffectiveDate: '2026-01-01',
    availabilityStatus: 'متوفر',
    notes: 'متوفر بجميع منافذ القرى والوحدات المحلية',
  },
  {
    id: 'cmd-04',
    code: 'CMD-MEAT-01',
    name: 'لحوم بلدي طازجة',
    category: 'اللحوم',
    unit: 'كجم',
    brandName: 'بلدي محلي',
    countryOfOrigin: 'مصر',
    commodityType: 'غذائية عامة',
    isEssential: true,
    isSubjectToPriceRegulation: false,
    availabilityStatus: 'يوجد تفاوت ملحوظ بين الأسواق',
    notes: 'تتراوح الأسعار حسب القرية ومنافذ المبادرات الحكومية',
  },
  {
    id: 'cmd-05',
    code: 'CMD-FEED-01',
    name: 'علف دواجن تسمين بروتين ٢٣٪',
    category: 'الأعلاف والحبوب',
    unit: 'طن',
    brandName: 'مصانع الدلتا المعتمدة',
    countryOfOrigin: 'مصر',
    commodityType: 'أعلاف ومستلزمات',
    isEssential: true,
    isSubjectToPriceRegulation: false,
    availabilityStatus: 'متوفر',
    notes: 'تتم مراقبة فواتير المصانع وتواريخ الإنتاج',
  },
];

export const INITIAL_PRICE_OBSERVATIONS: CommodityPriceObservationRecord[] = [
  {
    id: 'obs-801',
    commodityId: 'cmd-01',
    commodityName: 'أرز أبيض بلدي معبأ عريض الحبة',
    category: 'الأرز',
    packageOrWeight: 'عبوة ١ كجم',
    unit: 'كجم',
    minPriceEgp: 28,
    maxPriceEgp: 30,
    avgPriceEgp: 29,
    announcedPriceEgp: 29,
    observedPriceEgp: 29,
    officialPriceEgp: 30,
    officialPriceSourceDecree: 'قرار مجلس الوزراء للسلع الاستراتيجية',
    officialPriceEffectiveDate: '2026-01-01',
    marketName: 'سوق صفط تراب الرئيسي',
    establishmentName: 'شركة ومخازن التوحيد لتجارة المواد الغذائية بالجملة',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    observationDate: '2026-11-24',
    inspectorName: 'مفتش/ سامي عبد القادر',
    priceSource: 'رصد ميداني مباشر',
    availabilityStatus: 'متوفر',
    notes: 'السعر المرصود ملتزم بالسقف السعري الاسترشادي',
  },
  {
    id: 'obs-802',
    commodityId: 'cmd-02',
    commodityName: 'سكر أبيض معبأ حر',
    category: 'السكر',
    packageOrWeight: 'عبوة ١ كجم',
    unit: 'كجم',
    minPriceEgp: 27,
    maxPriceEgp: 32,
    avgPriceEgp: 29.5,
    announcedPriceEgp: 27,
    observedPriceEgp: 31,
    officialPriceEgp: 27,
    officialPriceSourceDecree: 'قرار وزير التموين لمبادرة خفض أسعار السكر',
    officialPriceEffectiveDate: '2026-01-01',
    marketName: 'سوق الهياتم العمومي',
    establishmentName: 'هايبر وسوبر ماركت البركة الحديث',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    observationDate: '2026-11-24',
    inspectorName: 'مفتش/ طارق أبو زيد',
    priceSource: 'رصد ميداني مباشر',
    availabilityStatus: 'يوجد ارتفاع غير معتاد في السعر',
    notes: 'رصد زيادة ٤ جنيهات عن سعر المبادرة الرسمي وتم توجيه حملة ضبط أسعار',
  },
  {
    id: 'obs-803',
    commodityId: 'cmd-03',
    commodityName: 'زيت طعام خليط معبأ ١ لتر',
    category: 'الزيت',
    packageOrWeight: 'زجاجة ١ لتر',
    unit: 'لتر',
    minPriceEgp: 60,
    maxPriceEgp: 65,
    avgPriceEgp: 62.5,
    announcedPriceEgp: 63,
    observedPriceEgp: 63,
    officialPriceEgp: 65,
    officialPriceSourceDecree: 'قرار مجلس الوزراء للسلع الاستراتيجية',
    officialPriceEffectiveDate: '2026-01-01',
    marketName: 'سوق بشبيش التجاري',
    establishmentName: 'معرض ومخزن النور للسلع والمنظفات',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    observationDate: '2026-11-24',
    inspectorName: 'مفتش/ ياسر الشهاوي',
    priceSource: 'قائمة أسعار معلنة',
    availabilityStatus: 'متوفر',
    notes: 'الأسعار مستقرة ومعلنة بوضوح',
  },
  {
    id: 'obs-804',
    commodityId: 'cmd-01',
    commodityName: 'أرز أبيض بلدي معبأ عريض الحبة',
    category: 'الأرز',
    packageOrWeight: 'عبوة ١ كجم',
    unit: 'كجم',
    minPriceEgp: 27,
    maxPriceEgp: 29,
    avgPriceEgp: 28,
    announcedPriceEgp: 28,
    observedPriceEgp: 28,
    officialPriceEgp: 30,
    officialPriceSourceDecree: 'قرار مجلس الوزراء للسلع الاستراتيجية',
    officialPriceEffectiveDate: '2026-01-01',
    marketName: 'سوق البنوان',
    establishmentName: 'مؤسسة الصفا لتوزيع المواد الغذائية والزيوت',
    village: 'البنوان',
    localUnit: 'الوحدة المحلية بالبنوان',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    observationDate: '2026-11-23',
    inspectorName: 'مفتش/ هاني عبد اللطيف',
    priceSource: 'فاتورة تداول',
    availabilityStatus: 'متوفر',
    notes: 'وفرة في المعروض بقرية البنوان',
  },
];

export const INITIAL_BUTANE_ALLOCATIONS: ButaneVillageAllocationRecord[] = [
  {
    id: 'but-901',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    districtCenter: 'مركز المحلة الكبرى',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    traderOrWarehouseName: 'مستودع بوتاجاز صفط تراب الرئيسي — الحاج كمال الشناوي',
    taxCardNumber: '310-520-740',
    taxCardExpiryDate: '2028-01-31',
    commercialRegisterNumber: '66120 محلة',
    commercialRegisterExpiryDate: '2028-02-28',
    licenseNumber: 'ر.بوتاجاز/١٠٤/غربية',
    licenseExpiryDate: '2027-08-31',
    populationCount: 42500,
    familiesCount: 9800,
    beneficiariesCountCurrent: 11900,
    distributionOutletsCount: 4,
    warehousesCount: 1,
    allocatedQuotaCylinders: 14500,
    receivedQuantityCylinders: 14200,
    distributedQuantityCylinders: 13850,
    remainingQuantityCylinders: 350,
    domesticCylindersCount: 12900,
    commercialCylindersCount: 950,
    lastUpdatedDate: '2026-11-24',
    yearlyHistory: [
      { year: 2023, beneficiariesCount: 11200, allocatedCylinders: 13500, receivedCylinders: 13300, distributedCylinders: 13100, remainingCylinders: 200 },
      { year: 2024, beneficiariesCount: 11550, allocatedCylinders: 14000, receivedCylinders: 13850, distributedCylinders: 13500, remainingCylinders: 350 },
      { year: 2025, beneficiariesCount: 11900, allocatedCylinders: 14500, receivedCylinders: 14200, distributedCylinders: 13850, remainingCylinders: 350 },
    ],
  },
  {
    id: 'but-902',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    districtCenter: 'مركز المحلة الكبرى',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    traderOrWarehouseName: 'مستودع وموزعو الهياتم المعتمدون — محمود رجب العشماوي',
    taxCardNumber: '215-418-629',
    taxCardExpiryDate: '2027-12-31',
    commercialRegisterNumber: '54120 محلة',
    commercialRegisterExpiryDate: '2028-01-15',
    licenseNumber: 'تصريح-توزيع/٢٠٢٤/٧١',
    licenseExpiryDate: '2027-06-30',
    populationCount: 38900,
    familiesCount: 8900,
    beneficiariesCountCurrent: 10850,
    distributionOutletsCount: 3,
    warehousesCount: 1,
    allocatedQuotaCylinders: 13000,
    receivedQuantityCylinders: 12750,
    distributedQuantityCylinders: 12400,
    remainingQuantityCylinders: 350,
    domesticCylindersCount: 11600,
    commercialCylindersCount: 800,
    lastUpdatedDate: '2026-11-24',
    yearlyHistory: [
      { year: 2023, beneficiariesCount: 10100, allocatedCylinders: 12100, receivedCylinders: 11950, distributedCylinders: 11800, remainingCylinders: 150 },
      { year: 2024, beneficiariesCount: 10480, allocatedCylinders: 12600, receivedCylinders: 12400, distributedCylinders: 12150, remainingCylinders: 250 },
      { year: 2025, beneficiariesCount: 10850, allocatedCylinders: 13000, receivedCylinders: 12750, distributedCylinders: 12400, remainingCylinders: 350 },
    ],
  },
  {
    id: 'but-903',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    districtCenter: 'مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    traderOrWarehouseName: 'مستودع بوتاجاز بشبيش والبنوان المطور — الحاج عبد العزيز أبو النجا',
    taxCardNumber: '318-624-951',
    taxCardExpiryDate: '2027-09-30',
    commercialRegisterNumber: '68450 محلة',
    commercialRegisterExpiryDate: '2027-10-15',
    licenseNumber: 'ر.بوتاجاز/١١٩/غربية',
    licenseExpiryDate: '2027-03-15',
    populationCount: 51200,
    familiesCount: 11600,
    beneficiariesCountCurrent: 14600,
    distributionOutletsCount: 5,
    warehousesCount: 1,
    allocatedQuotaCylinders: 17500,
    receivedQuantityCylinders: 17100,
    distributedQuantityCylinders: 16800,
    remainingQuantityCylinders: 300,
    domesticCylindersCount: 15500,
    commercialCylindersCount: 1300,
    lastUpdatedDate: '2026-11-24',
    yearlyHistory: [
      { year: 2023, beneficiariesCount: 13700, allocatedCylinders: 16200, receivedCylinders: 16000, distributedCylinders: 15750, remainingCylinders: 250 },
      { year: 2024, beneficiariesCount: 14150, allocatedCylinders: 16900, receivedCylinders: 16600, distributedCylinders: 16300, remainingCylinders: 300 },
      { year: 2025, beneficiariesCount: 14600, allocatedCylinders: 17500, receivedCylinders: 17100, distributedCylinders: 16800, remainingCylinders: 300 },
    ],
  },
  {
    id: 'but-904',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    districtCenter: 'مركز المحلة الكبرى',
    village: 'محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    traderOrWarehouseName: 'منفذ ومستودع محلة أبو علي — السيد فؤاد البلتاجي',
    taxCardNumber: '219-532-841',
    taxCardExpiryDate: '2027-11-30',
    commercialRegisterNumber: '55890 محلة',
    commercialRegisterExpiryDate: '2027-12-20',
    licenseNumber: 'تصريح-توزيع/٢٠٢٤/٨٤',
    licenseExpiryDate: '2027-04-30',
    populationCount: 46800,
    familiesCount: 10500,
    beneficiariesCountCurrent: 13100,
    distributionOutletsCount: 4,
    warehousesCount: 1,
    allocatedQuotaCylinders: 15200,
    receivedQuantityCylinders: 14900,
    distributedQuantityCylinders: 14550,
    remainingQuantityCylinders: 350,
    domesticCylindersCount: 13450,
    commercialCylindersCount: 1100,
    lastUpdatedDate: '2026-11-24',
    yearlyHistory: [
      { year: 2023, beneficiariesCount: 12300, allocatedCylinders: 14300, receivedCylinders: 14100, distributedCylinders: 13850, remainingCylinders: 250 },
      { year: 2024, beneficiariesCount: 12700, allocatedCylinders: 14800, receivedCylinders: 14550, distributedCylinders: 14200, remainingCylinders: 350 },
      { year: 2025, beneficiariesCount: 13100, allocatedCylinders: 15200, receivedCylinders: 14900, distributedCylinders: 14550, remainingCylinders: 350 },
    ],
  },
];

export const INITIAL_PETROLEUM_ALLOCATIONS: PetroleumAllocationRecord[] = [
  {
    id: 'pet-1001',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    traderOrStationName: 'محطة مصر للبترول — صفط تراب النموذجية (م. حسام الدين عبد اللطيف)',
    taxCardNumber: '410-820-930',
    taxCardExpiryDate: '2028-03-31',
    commercialRegisterNumber: '74102 محلة',
    commercialRegisterExpiryDate: '2028-05-15',
    licenseNumber: 'ر.بترول/٤١٢/غربية',
    licenseExpiryDate: '2027-09-30',
    productType: 'سولار',
    beneficiariesCountCurrent: 3200,
    beneficiaryVehiclesOrEntitiesCount: 840,
    openingBalance: 12000,
    allocatedQuota: 140000,
    receivedQuantity: 135000,
    distributedQuantity: 131500,
    remainingQuantity: 15500,
    unit: 'لتر',
    dataPeriod: 'نوفمبر ٢٠٢٦',
    dataSource: 'سجل ٢١ بترول وإخطارات شركات التوزيع',
    lastUpdatedDate: '2026-11-24',
    yearlyHistory: [
      { year: 2023, beneficiariesCount: 2950, allocatedQuantity: 130000, receivedQuantity: 127000, distributedQuantity: 125500, remainingQuantity: 10500 },
      { year: 2024, beneficiariesCount: 3080, allocatedQuantity: 135000, receivedQuantity: 131000, distributedQuantity: 128000, remainingQuantity: 13500 },
      { year: 2025, beneficiariesCount: 3200, allocatedQuantity: 140000, receivedQuantity: 135000, distributedQuantity: 131500, remainingQuantity: 15500 },
    ],
  },
  {
    id: 'pet-1002',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    traderOrStationName: 'محطة تموين الهياتم البترولية — أ. طارق الشافعي',
    taxCardNumber: '415-912-308',
    taxCardExpiryDate: '2027-12-15',
    commercialRegisterNumber: '74980 محلة',
    commercialRegisterExpiryDate: '2028-02-20',
    licenseNumber: 'ر.بترول/٤١٨/غربية',
    licenseExpiryDate: '2027-07-31',
    productType: 'بنزين 80',
    beneficiariesCountCurrent: 2650,
    beneficiaryVehiclesOrEntitiesCount: 710,
    openingBalance: 8500,
    allocatedQuota: 95000,
    receivedQuantity: 92000,
    distributedQuantity: 90200,
    remainingQuantity: 10300,
    unit: 'لتر',
    dataPeriod: 'نوفمبر ٢٠٢٦',
    dataSource: 'سجل ٢١ بترول وإخطارات شركات التوزيع',
    lastUpdatedDate: '2026-11-24',
    yearlyHistory: [
      { year: 2023, beneficiariesCount: 2450, allocatedQuantity: 88000, receivedQuantity: 86500, distributedQuantity: 85000, remainingQuantity: 7500 },
      { year: 2024, beneficiariesCount: 2550, allocatedQuantity: 91500, receivedQuantity: 89000, distributedQuantity: 87800, remainingQuantity: 8700 },
      { year: 2025, beneficiariesCount: 2650, allocatedQuantity: 95000, receivedQuantity: 92000, distributedQuantity: 90200, remainingQuantity: 10300 },
    ],
  },
  {
    id: 'pet-1003',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    traderOrStationName: 'محطة التعاون للبترول — بشبيش (أ. مجدي عبد الوهاب الفقي)',
    taxCardNumber: '419-731-642',
    taxCardExpiryDate: '2027-10-20',
    commercialRegisterNumber: '75890 محلة',
    commercialRegisterExpiryDate: '2027-11-30',
    licenseNumber: 'ر.بترول/٤٢٩/غربية',
    licenseExpiryDate: '2026-12-05',
    productType: 'بنزين 92',
    beneficiariesCountCurrent: 4100,
    beneficiaryVehiclesOrEntitiesCount: 1180,
    openingBalance: 14000,
    allocatedQuota: 165000,
    receivedQuantity: 160000,
    distributedQuantity: 156500,
    remainingQuantity: 17500,
    unit: 'لتر',
    dataPeriod: 'نوفمبر ٢٠٢٦',
    dataSource: 'سجل ٢١ بترول وإخطارات شركات التوزيع',
    lastUpdatedDate: '2026-11-24',
    yearlyHistory: [
      { year: 2023, beneficiariesCount: 3750, allocatedQuantity: 150000, receivedQuantity: 147000, distributedQuantity: 145000, remainingQuantity: 12000 },
      { year: 2024, beneficiariesCount: 3920, allocatedQuantity: 158000, receivedQuantity: 154000, distributedQuantity: 151500, remainingQuantity: 14500 },
      { year: 2025, beneficiariesCount: 4100, allocatedQuantity: 165000, receivedQuantity: 160000, distributedQuantity: 156500, remainingQuantity: 17500 },
    ],
  },
];

export const INITIAL_FUEL_STATIONS: FuelStationRecord[] = [
  {
    id: 'fs-1101',
    stationCode: 'FS-MAH-01',
    stationName: 'محطة مصر للبترول — صفط تراب النموذجية',
    operatingCompany: 'شركة مصر للبترول',
    ownerOrManagerName: 'م. حسام الدين عبد اللطيف',
    licenseNumber: 'ر.بترول/٤١٢/غربية',
    licenseExpiryDate: '2027-09-30',
    taxCardNumber: '410-820-930',
    taxCardExpiryDate: '2028-03-31',
    commercialRegisterNumber: '74102 محلة',
    commercialRegisterExpiryDate: '2028-05-15',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    address: 'طريق المحلة طنطا — مدخل صفط تراب',
    pumpsCount: 6,
    fuelTypes: ['سولار', 'بنزين 80', 'بنزين 92', 'بنزين 95'],
    totalTanksCapacityLiters: 120000,
    safetyThresholdLiters: 10000,
    operationStatus: 'تعمل بكامل الطاقة',
    phone: '01003344556',
    documents: ['ترخيص_تشغيل_محطة_412.pdf', 'شهادة_معايرة_الطلمبات.pdf'],
  },
  {
    id: 'fs-1102',
    stationCode: 'FS-MAH-02',
    stationName: 'محطة التعاون للبترول — بشبيش',
    operatingCompany: 'الجمعية التعاونية للبترول',
    ownerOrManagerName: 'أ. مجدي عبد الوهاب الفقي',
    licenseNumber: 'ر.بترول/٤٢٩/غربية',
    licenseExpiryDate: '2026-12-05', // قارب على الانتهاء
    taxCardNumber: '419-731-642',
    taxCardExpiryDate: '2027-10-20',
    commercialRegisterNumber: '75890 محلة',
    commercialRegisterExpiryDate: '2027-11-30',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    address: 'الطريق الرئيسي — قرية بشبيش',
    pumpsCount: 4,
    fuelTypes: ['سولار', 'بنزين 80', 'بنزين 92'],
    totalTanksCapacityLiters: 85000,
    safetyThresholdLiters: 8000,
    operationStatus: 'تعمل بكامل الطاقة',
    phone: '01225566778',
    documents: ['ترخيص_محطة_بشبيش_429.pdf'],
  },
];

export const INITIAL_FUEL_STATION_MOVEMENTS: FuelStationDailyMovementRecord[] = [
  {
    id: 'fsm-1201',
    movementDate: '2026-11-24',
    stationId: 'fs-1101',
    stationCode: 'FS-MAH-01',
    stationName: 'محطة مصر للبترول — صفط تراب النموذجية',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    productType: 'سولار',
    openingBalanceLiters: 18500,
    receivedQuantityLiters: 20000,
    supplyPermitNumber: 'إذن-شحن-بترول-٧٧٤١٢',
    supplierEntity: 'مستودع طنطا الرئيسي — مصر للبترول',
    soldQuantityLiters: 23000,
    dispensedQuantityLiters: 23000,
    approvedAdjustmentsLiters: 0,
    bookClosingBalanceLiters: 15500,
    actualTankMeasurementLiters: 15500,
    meterReadingStart: 412500,
    meterReadingEnd: 435500,
    inventoryDiffLiters: 0,
    responsibleName: 'م. حسام الدين عبد اللطيف',
    isApproved: true,
    notes: 'الرصيد الدفتري مطابق للقياس الفعلي وقراءة العدادات',
  },
  {
    id: 'fsm-1202',
    movementDate: '2026-11-24',
    stationId: 'fs-1102',
    stationCode: 'FS-MAH-02',
    stationName: 'محطة التعاون للبترول — بشبيش',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    productType: 'سولار',
    openingBalanceLiters: 14200,
    receivedQuantityLiters: 15000,
    supplyPermitNumber: 'إذن-شحن-تعاون-٨٨١٠٩',
    supplierEntity: 'مستودع التعاون للبترول بطنطا',
    soldQuantityLiters: 22500,
    dispensedQuantityLiters: 22500,
    approvedAdjustmentsLiters: 0,
    bookClosingBalanceLiters: 6700,
    actualTankMeasurementLiters: 5850, // فرق عجز 850 لتر + انخفاض عن حد الأمان 8000 لتر!
    meterReadingStart: 810200,
    meterReadingEnd: 832700,
    inventoryDiffLiters: -850,
    responsibleName: 'أ. مجدي عبد الوهاب الفقي',
    isApproved: true,
    notes: 'رصد عجز ٨٥٠ لتر بين الرصيد الدفتري بسجل ٢١ بترول والقياس الفعلي للخزان',
  },
];

export const INITIAL_FUEL_STATION_INSPECTIONS: FuelStationInspectionRecord[] = [
  {
    id: 'fsi-1301',
    inspectionDate: '2026-11-24',
    inspectorName: 'مفتش/ ياسر الشهاوي',
    stationId: 'fs-1102',
    stationName: 'محطة التعاون للبترول — بشبيش',
    village: 'بشبيش',
    productType: 'سولار',
    meterReadingObserved: 832700,
    actualQuantityLiters: 5850,
    bookBalanceMatched: false,
    announcedPricesStatus: 'مطابقة للتسعيرة الرسمية',
    pumpsCondition: 'سليمة وتعمل',
    calibrationStatus: 'معايرة قانونية سارية',
    inspectionNotes: 'تبين وجود عجز مقداره ٨٥٠ لتر سولار عن الرصيد الدفتري المثبت بسجل ٢١ بترول',
    violationsFound: 'التلاعب في كميات الاستلام والتسليم والتصرف في ٨٥٠ لتر سولار مدعم',
    reportNumber: 'جنحة-بترول-٢٠٢٦-١١٦٥',
    photos: ['صورة_قياس_خزان_بشبيش.jpg'],
    recommendations: 'تحصيل فروق الدعم وإحالة المحضر للنيابة العامة ومتابعة التوريد القادم',
  },
];

export const INITIAL_BUTANE_WAREHOUSES: ButaneWarehouseRecord[] = [
  {
    id: 'bw-1401',
    warehouseCode: 'BW-MAH-01',
    warehouseName: 'مستودع بوتاجاز صفط تراب الرئيسي',
    ownerName: 'شركة الغازات البترولية / وكيل معتمد: الحاج كمال الشناوي',
    managerName: 'أ. نبيل كمال الشناوي',
    licenseNumber: 'ر.بوتاجاز/١٠٤/غربية',
    licenseExpiryDate: '2027-08-31',
    taxCardNumber: '310-520-740',
    taxCardExpiryDate: '2028-01-31',
    commercialRegisterNumber: '66120 محلة',
    commercialRegisterExpiryDate: '2028-02-28',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    address: 'طريق صفط تراب — الهياتم، خارج الكتلة السكنية',
    storageCapacityCylinders: 3500,
    currentCylindersCount: 920,
    cylinderTypes: 'منزلي ١٢٫٥ كجم وتجاري ٢٥ كجم',
    operationStatus: 'يعمل بانتظام',
    workersCount: 12,
    phone: '01007788991',
    affiliatedDistributorsCount: 8,
    servedAreas: 'صفط تراب، الهياتم، عزبة الشامي، عزبة المنشية',
    beneficiaryVillages: ['صفط تراب', 'الهياتم'],
    distributionPointsCount: 7,
    allocatedMonthlyQuota: 27500,
    distributedMonthlyQuantity: 26250,
    safetyStockThreshold: 450,
    photos: ['صورة_مستودع_صفط_تراب.jpg'],
    documents: ['رخصة_المستودع_104.pdf', 'موافقة_الحماية_المدنية.pdf'],
  },
  {
    id: 'bw-1402',
    warehouseCode: 'BW-MAH-02',
    warehouseName: 'مستودع بوتاجاز بشبيش والبنوان المطور',
    ownerName: 'الحاج عبد العزيز أبو النجا',
    managerName: 'أ. شريف عبد العزيز أبو النجا',
    licenseNumber: 'ر.بوتاجاز/١١٩/غربية',
    licenseExpiryDate: '2027-03-15',
    taxCardNumber: '318-624-951',
    taxCardExpiryDate: '2027-09-30',
    commercialRegisterNumber: '68450 محلة',
    commercialRegisterExpiryDate: '2027-10-15',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    address: 'المنطقة الشرقية — طريق بشبيش البنوان',
    storageCapacityCylinders: 4000,
    currentCylindersCount: 380, // أقل من حد الأمان (450) لإطلاق تنبيه ذكي!
    cylinderTypes: 'منزلي ١٢٫٥ كجم وتجاري ٢٥ كجم',
    operationStatus: 'يعمل بانتظام',
    workersCount: 15,
    phone: '01118899002',
    affiliatedDistributorsCount: 10,
    servedAreas: 'بشبيش، البنوان، محلة أبو علي، القرى المجاورة',
    beneficiaryVillages: ['بشبيش', 'محلة أبو علي', 'البنوان'],
    distributionPointsCount: 9,
    allocatedMonthlyQuota: 32700,
    distributedMonthlyQuantity: 31350,
    safetyStockThreshold: 450,
    photos: ['صورة_مستودع_بشبيش.jpg'],
    documents: ['رخصة_المستودع_119.pdf'],
  },
];

export const INITIAL_BUTANE_WAREHOUSE_MOVEMENTS: ButaneWarehouseMovementRecord[] = [
  {
    id: 'bwm-1501',
    movementDate: '2026-11-24',
    warehouseId: 'bw-1401',
    warehouseCode: 'BW-MAH-01',
    warehouseName: 'مستودع بوتاجاز صفط تراب الرئيسي',
    village: 'صفط تراب',
    openingBalance: 750,
    receivedQuantity: 1200,
    supplyPermitNumber: 'إذن-بتروجاس-٥٥١٠٢',
    supplierEntity: 'مصنع تعبئة بتروجاس بطنطا',
    dispensedQuantity: 1030,
    deliveryPermitToDistributorNo: 'إذن-تسليم-موزعين-٩٠١',
    domesticCylindersCount: 950,
    commercialCylindersCount: 80,
    returnedCylindersCount: 10,
    excludedDamagedCylindersCount: 10,
    damagedExclusionDocNo: 'محضر-فرز-تالف-٤٤',
    closingBalance: 920, // 750 + 1200 - 1030 + 10 - 10 = 920
    actualCount: 920,
    discrepancyDiff: 0,
    responsibleName: 'أ. نبيل كمال الشناوي',
    isApproved: true,
  },
  {
    id: 'bwm-1502',
    movementDate: '2026-11-24',
    warehouseId: 'bw-1402',
    warehouseCode: 'BW-MAH-02',
    warehouseName: 'مستودع بوتاجاز بشبيش والبنوان المطور',
    village: 'بشبيش',
    openingBalance: 600,
    receivedQuantity: 900,
    supplyPermitNumber: 'إذن-بتروجاس-٥٥١١٨',
    supplierEntity: 'مصنع تعبئة بتروجاس بطنطا',
    dispensedQuantity: 1120,
    deliveryPermitToDistributorNo: 'إذن-تسليم-موزعين-٩٠٢',
    domesticCylindersCount: 1020,
    commercialCylindersCount: 100,
    returnedCylindersCount: 5,
    excludedDamagedCylindersCount: 5,
    damagedExclusionDocNo: 'محضر-فرز-تالف-٤٥',
    closingBalance: 380, // 600 + 900 - 1120 + 5 - 5 = 380
    actualCount: 380,
    discrepancyDiff: 0,
    responsibleName: 'أ. شريف عبد العزيز أبو النجا',
    isApproved: true,
  },
];

export const INITIAL_BUTANE_DISTRIBUTORS: ButaneDistributorRecord[] = [
  {
    id: 'bd-1601',
    distributorCode: 'DST-MAH-101',
    distributorName: 'محمود رجب العشماوي',
    nationalId: '28105141601233',
    phone: '01012233445',
    address: 'شارع داير الناحية — قرية صفط تراب',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    affiliatedWarehouseId: 'bw-1401',
    affiliatedWarehouseName: 'مستودع بوتاجاز صفط تراب الرئيسي',
    permitOrLicenseNumber: 'تصريح-توزيع/٢٠٢٤/٧١',
    licenseExpiryDate: '2027-06-30',
    taxCardNumber: '215-418-629',
    taxCardExpiryDate: '2027-12-31',
    commercialRegisterNumber: '54120 محلة',
    commercialRegisterExpiryDate: '2028-01-15',
    startDate: '2018-01-10',
    status: 'نشط',
    assignedAreas: 'قرية صفط تراب وعزبة الشامي',
    transportMode: 'سيارة ربع نقل مرخصة',
    vehiclePlateNumber: 'ع ر ب ٤٨٢١',
    vehicleCapacityCylinders: 150,
    allocatedCylindersQuota: 300,
    documents: ['تصريح_التوزيع_71.pdf', 'رخصة_المركبة_4821.pdf'],
    notes: 'ملتزم بخط السير والتسعيرة الرسمية',
  },
  {
    id: 'bd-1602',
    distributorCode: 'DST-MAH-102',
    distributorName: 'السيد فؤاد البلتاجي',
    nationalId: '28408221602411',
    phone: '01223344559',
    address: 'الشارع القبلي — قرية بشبيش',
    supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    affiliatedWarehouseId: 'bw-1402',
    affiliatedWarehouseName: 'مستودع بوتاجاز بشبيش والبنوان المطور',
    permitOrLicenseNumber: 'تصريح-توزيع/٢٠٢٤/٨٤',
    licenseExpiryDate: '2027-04-30',
    taxCardNumber: '219-532-841',
    taxCardExpiryDate: '2027-11-30',
    commercialRegisterNumber: '55890 محلة',
    commercialRegisterExpiryDate: '2027-12-20',
    startDate: '2019-06-15',
    status: 'نشط',
    assignedAreas: 'قرية بشبيش والبنوان',
    transportMode: 'سيارة ربع نقل مرخصة',
    vehiclePlateNumber: 'ع ط د ٩١٥٢',
    vehicleCapacityCylinders: 180,
    allocatedCylindersQuota: 350,
    documents: ['تصريح_التوزيع_84.pdf'],
    notes: 'يغطي المناطق الطرفية بقرية بشبيش والبنوان',
  },
];

export const INITIAL_BUTANE_DISTRIBUTOR_MOVEMENTS: ButaneDistributorMovementRecord[] = [
  {
    id: 'bdm-1701',
    movementDate: '2026-11-24',
    distributorId: 'bd-1601',
    distributorName: 'محمود رجب العشماوي',
    warehouseId: 'bw-1401',
    warehouseName: 'مستودع بوتاجاز صفط تراب الرئيسي',
    warehouseDeliveryPermitNo: 'إذن-تسليم-موزعين-٩٠١',
    previousBalance: 15,
    receivedCylinders: 280,
    distributedCylinders: 270,
    returnedCylinders: 4,
    approvedDamagedCylinders: 4,
    remainingBalance: 25, // 15 + 280 - 270 - 4 + 4 = 25
    servedVillages: 'صفط تراب، عزبة الشامي',
    beneficiariesServedCount: 270,
    officialUnitPriceEgp: 150,
    receiptOrDeliveryDocNo: 'كشف-توزيع-٩٠١-أ',
    responsibleName: 'مفتش/ سامي عبد القادر',
    isApproved: true,
    notes: 'مرتبط بإذن تسليم المستودع رقم (إذن-تسليم-موزعين-٩٠١) لمنع ازدواجية الاحتساب',
  },
  {
    id: 'bdm-1702',
    movementDate: '2026-11-24',
    distributorId: 'bd-1602',
    distributorName: 'السيد فؤاد البلتاجي',
    warehouseId: 'bw-1402',
    warehouseName: 'مستودع بوتاجاز بشبيش والبنوان المطور',
    warehouseDeliveryPermitNo: 'إذن-تسليم-موزعين-٩٠٢',
    previousBalance: 20,
    receivedCylinders: 320,
    distributedCylinders: 310,
    returnedCylinders: 2,
    approvedDamagedCylinders: 2,
    remainingBalance: 30, // 20 + 320 - 310 - 2 + 2 = 30
    servedVillages: 'بشبيش، البنوان',
    beneficiariesServedCount: 310,
    officialUnitPriceEgp: 150,
    receiptOrDeliveryDocNo: 'كشف-توزيع-٩٠٢-أ',
    responsibleName: 'مفتش/ ياسر الشهاوي',
    isApproved: true,
    notes: 'مرتبط بإذن تسليم المستودع رقم (إذن-تسليم-موزعين-٩٠٢) لمنع ازدواجية الاحتساب',
  },
];

// ==================== محرك توليد التنبيهات الذكية لقسم التجارة الداخلية ====================

export function generateInternalTradeSmartAlerts(params: {
  establishments: CommercialEstablishmentRecord[];
  licenses: CommercialLicenseRecord[];
  campaigns: TradeInspectionCampaignRecord[];
  reports: CommercialViolationReportRecord[];
  settlements: CommercialSettlementRecord[];
  seizures: CommercialSeizureRecord[];
  priceObservations: CommodityPriceObservationRecord[];
  fuelStations: FuelStationRecord[];
  fuelMovements: FuelStationDailyMovementRecord[];
  butaneWarehouses: ButaneWarehouseRecord[];
  settings: InternalTradeSettings;
  todayRef: string;
}): InternalTradeAlertRecord[] {
  const alerts: InternalTradeAlertRecord[] = [];
  let seq = 1;
  const nextAlertNo = () => `ALT-TRD-2026-${String(seq++).padStart(3, '0')}`;

  // ١. تنبيهات المنشآت والتراخيص
  params.establishments.forEach((est) => {
    if (!est.isLicensed) {
      alerts.push({
        id: `al-unlic-${est.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات المنشآت والتراخيص',
        alertType: 'منشأة غير مرخصة',
        sourceSection: 'سجل المحلات والمنشآت التجارية',
        linkedRecordCode: est.autoCode,
        linkedRecordTitle: `${est.name} (${est.ownerName})`,
        supplyAdministration: est.supplyAdministration,
        village: est.village,
        severity: 'عاجل',
        createdAt: params.todayRef,
        responsibleEmployee: 'مسؤول التراخيص والتفتيش',
        requiredAction: 'توجيه حملة معاينة وإنذار باستخراج الترخيص أو اتخاذ إجراءات الغلق الإداري',
        dueDate: params.todayRef,
        status: 'مفتوح',
      });
    }
    if (est.hasUnregisteredOrMismatchedActivity) {
      alerts.push({
        id: `al-mism-${est.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات المنشآت والتراخيص',
        alertType: 'نشاط غير مطابق للترخيص',
        sourceSection: 'الأنشطة التجارية',
        linkedRecordCode: est.autoCode,
        linkedRecordTitle: `${est.name} — ${est.unregisteredActivityDetails || 'نشاط غير مضاف'}`,
        supplyAdministration: est.supplyAdministration,
        village: est.village,
        severity: 'مرتفع',
        createdAt: params.todayRef,
        responsibleEmployee: 'مسؤول الأنشطة والتراخيص',
        requiredAction: 'تحرير محضر ممارسة نشاط مخالف للترخيص وإلزام بتحديث السجل التجاري',
        dueDate: params.todayRef,
        status: 'مفتوح',
      });
    }
    // فحص فترة عدم المرور على المنشأة
    const t0 = new Date(params.todayRef).getTime();
    const tLast = new Date(est.lastInspectionDate).getTime();
    if (!Number.isNaN(t0) && !Number.isNaN(tLast)) {
      const daysSince = Math.floor((t0 - tLast) / 86400000);
      if (daysSince >= params.settings.uninspectedEstablishmentMaxDays) {
        alerts.push({
          id: `al-noinsp-${est.id}`,
          alertNumber: nextAlertNo(),
          domainCategory: 'تنبيهات المنشآت والتراخيص',
          alertType: 'منشأة لم يتم المرور عليها خلال الفترة المحددة',
          sourceSection: 'سجل المحلات والمنشآت التجارية',
          linkedRecordCode: est.autoCode,
          linkedRecordTitle: `${est.name} (مر ${daysSince} يوماً منذ آخر مرور)`,
          supplyAdministration: est.supplyAdministration,
          village: est.village,
          severity: 'متوسط',
          createdAt: params.todayRef,
          responsibleEmployee: 'مسؤول الحملات التموينية',
          requiredAction: 'إدراج المنشأة في خطة المرور الميداني للأسبوع الحالي',
          dueDate: params.todayRef,
          status: 'مفتوح',
        });
      }
    }
  });

  params.licenses.forEach((lic) => {
    const evalRes = computeLicenseAlertStatus(
      lic.expiryDate,
      true,
      params.todayRef,
      params.settings.licenseAlertThresholdsDays
    );
    if (evalRes.severity !== 'سليم') {
      alerts.push({
        id: `al-lic-${lic.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات المنشآت والتراخيص',
        alertType: evalRes.status === 'منتهي' ? 'ترخيص منتهٍ' : `ترخيص اقترب من الانتهاء (${evalRes.status})`,
        sourceSection: 'التراخيص التجارية',
        linkedRecordCode: lic.licenseNumber,
        linkedRecordTitle: `${lic.establishmentName} — ${lic.licenseType}`,
        supplyAdministration: lic.supplyAdministration,
        village: lic.village,
        severity: evalRes.severity,
        createdAt: params.todayRef,
        responsibleEmployee: lic.responsibleEmployee,
        requiredAction: 'إخطار صاحب المنشأة بتجديد الترخيص لدى الجهة المختصة ومراجعة الملف',
        dueDate: lic.expiryDate,
        status: 'مفتوح',
      });
    }
  });

  // ٢. تنبيهات الحملات والمخالفات والمضبوطات
  params.campaigns
    .filter((c) => c.status === 'جاري تنفيذها')
    .forEach((c) => {
      alerts.push({
        id: `al-cmp-${c.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات الحملات والمخالفات',
        alertType: 'حملة لم يتم استكمال تقريرها النهائي',
        sourceSection: 'الحملات التموينية',
        linkedRecordCode: c.campaignNumber,
        linkedRecordTitle: `${c.campaignType} — ${c.village}`,
        supplyAdministration: c.supplyAdministration,
        village: c.village,
        severity: 'متوسط',
        createdAt: c.campaignDate,
        responsibleEmployee: c.campaignLeader,
        requiredAction: 'استكمال إدخال نتائج المرور وإغلاق تقرير الحملة',
        dueDate: params.todayRef,
        status: 'قيد المعالجة',
      });
    });

  params.settlements
    .filter((s) => s.remainingAmountEgp > 0)
    .forEach((s) => {
      alerts.push({
        id: `al-stl-${s.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات الحملات والمخالفات',
        alertType: 'تصالح لم يتم استكمال سداده',
        sourceSection: 'التصالحات والتسويات',
        linkedRecordCode: s.settlementRequestNumber,
        linkedRecordTitle: `${s.establishmentName} (متبقي ${s.remainingAmountEgp} ج.م)`,
        supplyAdministration: s.supplyAdministration,
        village: s.village,
        severity: 'مرتفع',
        createdAt: s.requestDate,
        responsibleEmployee: 'مسؤول التصالحات والشؤون القانونية',
        requiredAction: 'متابعة تحصيل باقي مبلغ التصالح المعتمد وإرفاق إيصال السداد',
        dueDate: params.todayRef,
        status: 'مفتوح',
      });
    });

  params.seizures
    .filter((sz) => !sz.disposalDecisionNumber)
    .forEach((sz) => {
      alerts.push({
        id: `al-sz-${sz.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات الحملات والمخالفات',
        alertType: 'مضبوطات لم يتم تحديد مصيرها بقرار تصرف',
        sourceSection: 'المضبوطات والتحفظات',
        linkedRecordCode: sz.seizureNumber,
        linkedRecordTitle: `${sz.productName} (${sz.currentActualBalance} ${sz.unit}) — ${sz.establishmentName}`,
        supplyAdministration: sz.supplyAdministration,
        village: sz.village,
        severity: 'عاجل',
        createdAt: sz.seizureDate,
        responsibleEmployee: sz.custodianName,
        requiredAction: 'استعجال قرار النيابة العامة بالتصرف (إفراج / إعدام / بيع) قبل انتهاء التحفظ',
        dueDate: sz.custodyExpiryDate,
        status: 'مفتوح',
      });
    });

  // ٣. تنبيهات الأسواق والأسعار
  params.priceObservations.forEach((obs) => {
    if (obs.officialPriceEgp && obs.observedPriceEgp > obs.officialPriceEgp) {
      alerts.push({
        id: `al-prc-${obs.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات الأسواق والأسعار',
        alertType: 'زيادة سعر سلعة عن النطاق المرجعي المعتمد',
        sourceSection: 'متابعة الأسواق والأسعار',
        linkedRecordCode: obs.id,
        linkedRecordTitle: `${obs.commodityName} في ${obs.marketName} (${obs.observedPriceEgp} ج.م بدلاً من ${obs.officialPriceEgp} ج.م)`,
        supplyAdministration: obs.supplyAdministration,
        village: obs.village,
        severity: 'عاجل',
        createdAt: obs.observationDate,
        responsibleEmployee: obs.inspectorName,
        requiredAction: 'توجيه حملة ضبط أسعار للمنشأة وتحرير محضر بيع بأزيد من السعر الرسمي',
        dueDate: params.todayRef,
        status: 'مفتوح',
      });
    }
  });

  // ٤. تنبيهات البوتاجاز والوقود
  params.fuelMovements.forEach((fm) => {
    if (fm.inventoryDiffLiters !== 0) {
      alerts.push({
        id: `al-fmdiff-${fm.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات البوتاجاز والوقود',
        alertType: 'فرق في الحركة اليومية وجرد محطة وقود',
        sourceSection: 'محطات الوقود والرقابة اليومية',
        linkedRecordCode: fm.stationCode,
        linkedRecordTitle: `${fm.stationName} — فرق ${fm.inventoryDiffLiters} لتر (${fm.productType})`,
        supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
        village: fm.village,
        severity: 'عاجل',
        createdAt: fm.movementDate,
        responsibleEmployee: fm.responsibleName,
        requiredAction: 'مراجعة سجل ٢١ بترول ومعايرة الطلمبات واتخاذ الإجراء القانوني حيال العجز/الزيادة',
        dueDate: params.todayRef,
        status: 'مفتوح',
      });
    }
    const station = params.fuelStations.find((s) => s.id === fm.stationId);
    const safetyLimit = station?.safetyThresholdLiters ?? params.settings.fuelLowStockDefaultAlertLiters;
    if (fm.actualTankMeasurementLiters < safetyLimit) {
      alerts.push({
        id: `al-fmlow-${fm.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات البوتاجاز والوقود',
        alertType: 'انخفاض رصيد الوقود عن حد الأمان',
        sourceSection: 'محطات الوقود والرقابة اليومية',
        linkedRecordCode: fm.stationCode,
        linkedRecordTitle: `${fm.stationName} — الرصيد الفعلي ${fm.actualTankMeasurementLiters} لتر (${fm.productType})`,
        supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
        village: fm.village,
        severity: 'مرتفع',
        createdAt: fm.movementDate,
        responsibleEmployee: 'مسؤول المواد البترولية',
        requiredAction: 'التنسيق مع شركة التوزيع لاستعجال شحنة الإمداد للمحطة',
        dueDate: params.todayRef,
        status: 'مفتوح',
      });
    }
  });

  params.butaneWarehouses.forEach((bw) => {
    if (bw.currentCylindersCount < bw.safetyStockThreshold) {
      alerts.push({
        id: `al-bwlow-${bw.id}`,
        alertNumber: nextAlertNo(),
        domainCategory: 'تنبيهات البوتاجاز والوقود',
        alertType: 'انخفاض رصيد مستودع بوتاجاز عن حد الأمان',
        sourceSection: 'مستودعات البوتاجاز',
        linkedRecordCode: bw.warehouseCode,
        linkedRecordTitle: `${bw.warehouseName} — الرصيد الحالي ${bw.currentCylindersCount} أسطوانة (حد الأمان ${bw.safetyStockThreshold})`,
        supplyAdministration: bw.supplyAdministration,
        village: bw.village,
        severity: 'مرتفع',
        createdAt: params.todayRef,
        responsibleEmployee: 'مسؤول البوتاجاز',
        requiredAction: 'متابعة ورود حصة المستودع من مصنع تعبئة بتروجاس طنطا',
        dueDate: params.todayRef,
        status: 'مفتوح',
      });
    }
  });

  return alerts;
}

// ==================== الحفظ والاسترجاع المتزامن (LocalStorage + Supabase Ready) ====================

const KEYS = {
  settings: 'gharbia_internal_trade_settings_v2',
  establishments: 'gharbia_internal_trade_establishments_v2',
  activities: 'gharbia_internal_trade_activities_v2',
  licenses: 'gharbia_internal_trade_licenses_v2',
  campaigns: 'gharbia_internal_trade_campaigns_v2',
  violationCatalog: 'gharbia_internal_trade_violation_catalog_v2',
  violationReports: 'gharbia_internal_trade_violation_reports_v2',
  settlements: 'gharbia_internal_trade_settlements_v2',
  seizures: 'gharbia_internal_trade_seizures_v2',
  seizureMovements: 'gharbia_internal_trade_seizure_movements_v2',
  commodities: 'gharbia_internal_trade_commodities_v2',
  priceObservations: 'gharbia_internal_trade_price_observations_v2',
  butaneAllocations: 'gharbia_internal_trade_butane_allocations_v2',
  petroleumAllocations: 'gharbia_internal_trade_petroleum_allocations_v2',
  fuelStations: 'gharbia_internal_trade_fuel_stations_v2',
  fuelMovements: 'gharbia_internal_trade_fuel_movements_v2',
  fuelInspections: 'gharbia_internal_trade_fuel_inspections_v2',
  butaneWarehouses: 'gharbia_internal_trade_butane_warehouses_v2',
  butaneWarehouseMovements: 'gharbia_internal_trade_butane_warehouse_movements_v2',
  butaneDistributors: 'gharbia_internal_trade_butane_distributors_v2',
  butaneDistributorMovements: 'gharbia_internal_trade_butane_distributor_movements_v2',
};

function loadOrInit<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveStoreKey<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export const loadTradeSettings = () => loadOrInit(KEYS.settings, INITIAL_INTERNAL_TRADE_SETTINGS);
export const saveTradeSettings = (d: InternalTradeSettings) => saveStoreKey(KEYS.settings, d);

export const loadCommercialEstablishments = () => loadOrInit(KEYS.establishments, INITIAL_COMMERCIAL_ESTABLISHMENTS);
export const saveCommercialEstablishments = (d: CommercialEstablishmentRecord[]) => saveStoreKey(KEYS.establishments, d);

export const loadCommercialActivities = () => loadOrInit(KEYS.activities, INITIAL_COMMERCIAL_ACTIVITIES);
export const saveCommercialActivities = (d: CommercialActivityRecord[]) => saveStoreKey(KEYS.activities, d);

export const loadCommercialLicenses = () => loadOrInit(KEYS.licenses, INITIAL_COMMERCIAL_LICENSES);
export const saveCommercialLicenses = (d: CommercialLicenseRecord[]) => saveStoreKey(KEYS.licenses, d);

export const loadTradeCampaigns = () => loadOrInit(KEYS.campaigns, INITIAL_TRADE_CAMPAIGNS);
export const saveTradeCampaigns = (d: TradeInspectionCampaignRecord[]) => saveStoreKey(KEYS.campaigns, d);

export const loadCommercialViolationCatalog = () => loadOrInit(KEYS.violationCatalog, INITIAL_COMMERCIAL_VIOLATION_CATALOG);
export const saveCommercialViolationCatalog = (d: CommercialViolationCatalogItem[]) => saveStoreKey(KEYS.violationCatalog, d);

export const loadCommercialViolationReports = () => loadOrInit(KEYS.violationReports, INITIAL_COMMERCIAL_VIOLATION_REPORTS);
export const saveCommercialViolationReports = (d: CommercialViolationReportRecord[]) => saveStoreKey(KEYS.violationReports, d);

export const loadCommercialSettlements = () => loadOrInit(KEYS.settlements, INITIAL_COMMERCIAL_SETTLEMENTS);
export const saveCommercialSettlements = (d: CommercialSettlementRecord[]) => saveStoreKey(KEYS.settlements, d);

export const loadCommercialSeizures = () => loadOrInit(KEYS.seizures, INITIAL_COMMERCIAL_SEIZURES);
export const saveCommercialSeizures = (d: CommercialSeizureRecord[]) => saveStoreKey(KEYS.seizures, d);

export const loadSeizureMovements = () => loadOrInit(KEYS.seizureMovements, INITIAL_SEIZURE_MOVEMENTS);
export const saveSeizureMovements = (d: SeizureMovementRecord[]) => saveStoreKey(KEYS.seizureMovements, d);

export const loadMarketCommodities = () => loadOrInit(KEYS.commodities, INITIAL_MARKET_COMMODITIES);
export const saveMarketCommodities = (d: MarketCommodityRecord[]) => saveStoreKey(KEYS.commodities, d);

export const loadPriceObservations = () => loadOrInit(KEYS.priceObservations, INITIAL_PRICE_OBSERVATIONS);
export const savePriceObservations = (d: CommodityPriceObservationRecord[]) => saveStoreKey(KEYS.priceObservations, d);

export const loadButaneAllocations = () => loadOrInit(KEYS.butaneAllocations, INITIAL_BUTANE_ALLOCATIONS);
export const saveButaneAllocations = (d: ButaneVillageAllocationRecord[]) => saveStoreKey(KEYS.butaneAllocations, d);

export const loadPetroleumAllocations = () => loadOrInit(KEYS.petroleumAllocations, INITIAL_PETROLEUM_ALLOCATIONS);
export const savePetroleumAllocations = (d: PetroleumAllocationRecord[]) => saveStoreKey(KEYS.petroleumAllocations, d);

export const loadFuelStations = () => loadOrInit(KEYS.fuelStations, INITIAL_FUEL_STATIONS);
export const saveFuelStations = (d: FuelStationRecord[]) => saveStoreKey(KEYS.fuelStations, d);

export const loadFuelMovements = () => loadOrInit(KEYS.fuelMovements, INITIAL_FUEL_STATION_MOVEMENTS);
export const saveFuelMovements = (d: FuelStationDailyMovementRecord[]) => saveStoreKey(KEYS.fuelMovements, d);

export const loadFuelInspections = () => loadOrInit(KEYS.fuelInspections, INITIAL_FUEL_STATION_INSPECTIONS);
export const saveFuelInspections = (d: FuelStationInspectionRecord[]) => saveStoreKey(KEYS.fuelInspections, d);

export const loadButaneWarehouses = () => loadOrInit(KEYS.butaneWarehouses, INITIAL_BUTANE_WAREHOUSES);
export const saveButaneWarehouses = (d: ButaneWarehouseRecord[]) => saveStoreKey(KEYS.butaneWarehouses, d);

export const loadButaneWarehouseMovements = () => loadOrInit(KEYS.butaneWarehouseMovements, INITIAL_BUTANE_WAREHOUSE_MOVEMENTS);
export const saveButaneWarehouseMovements = (d: ButaneWarehouseMovementRecord[]) => saveStoreKey(KEYS.butaneWarehouseMovements, d);

export const loadButaneDistributors = () => loadOrInit(KEYS.butaneDistributors, INITIAL_BUTANE_DISTRIBUTORS);
export const saveButaneDistributors = (d: ButaneDistributorRecord[]) => saveStoreKey(KEYS.butaneDistributors, d);

export const loadButaneDistributorMovements = () => loadOrInit(KEYS.butaneDistributorMovements, INITIAL_BUTANE_DISTRIBUTOR_MOVEMENTS);
export const saveButaneDistributorMovements = (d: ButaneDistributorMovementRecord[]) => saveStoreKey(KEYS.butaneDistributorMovements, d);

export function factoryResetInternalTradeStore(): void {
  saveCommercialEstablishments([]);
  saveCommercialActivities([]);
  saveCommercialLicenses([]);
  saveTradeCampaigns([]);
  saveCommercialViolationReports([]);
  saveCommercialSettlements([]);
  saveCommercialSeizures([]);
  saveSeizureMovements([]);
  saveMarketCommodities([]);
  savePriceObservations([]);
  saveButaneAllocations([]);
  savePetroleumAllocations([]);
  saveFuelStations([]);
  saveFuelMovements([]);
  saveFuelInspections([]);
  saveButaneWarehouses([]);
  saveButaneWarehouseMovements([]);
  saveButaneDistributors([]);
  saveButaneDistributorMovements([]);
  saveTradeSettings(INITIAL_INTERNAL_TRADE_SETTINGS);
}

// ==================== الأدوار الوظيفية الـ ١٧ لقسم التجارة الداخلية ====================
export const INTERNAL_TRADE_RBAC_ROLES = [
  { code: 'system_admin', title: 'مدير النظام', scope: 'جميع الإدارات والأقسام', permissions: 'عرض، إضافة، تعديل، اعتماد، حذف منطقي، تصدير، طباعة، إدارة الإعدادات' },
  { code: 'directorate_director', title: 'مدير المديرية', scope: 'محافظة الغربية بالكامل', permissions: 'عرض، اعتماد، متابعة التقارير والمقارنات، تصدير، طباعة' },
  { code: 'administration_manager', title: 'مدير الإدارة', scope: 'الإدارة التموينية التابع لها', permissions: 'عرض، إضافة، تعديل، اعتماد المحاضر والحملات، تصدير، طباعة' },
  { code: 'internal_trade_director', title: 'مدير التجارة الداخلية', scope: 'قطاع التجارة الداخلية بالمحافظة', permissions: 'عرض، إضافة، تعديل، اعتماد التراخيص والحملات والتصالحات، تصدير، طباعة' },
  { code: 'department_head', title: 'رئيس قسم', scope: 'القسم المختص بالإدارة', permissions: 'عرض، إضافة، تعديل، مراجعة مبدئية، تصدير، طباعة' },
  { code: 'supply_inspector', title: 'مفتش تموين', scope: 'نطاق الحملات والقرى المكلف بها', permissions: 'عرض، تسجيل محاضر وحملات ورصد أسعار، طباعة' },
  { code: 'licensing_officer', title: 'مسؤول التراخيص', scope: 'سجل المنشآت والأنشطة والتراخيص', permissions: 'عرض، إضافة وتحديث التراخيص والمستندات، طباعة' },
  { code: 'campaigns_officer', title: 'مسؤول الحملات', scope: 'الحملات التموينية والمرور الميداني', permissions: 'عرض، إنشاء حملات، ربط المحاضر والمضبوطات، طباعة' },
  { code: 'violations_officer', title: 'مسؤول المخالفات والمحاضر', scope: 'سجل المخالفات والمحاضر والتصالحات', permissions: 'عرض، قيد المحاضر، متابعة التصالحات، طباعة' },
  { code: 'seizures_officer', title: 'مسؤول المضبوطات', scope: 'المضبوطات والتحفظات ودفتر الحركة', permissions: 'عرض، قيد المضبوطات، تسجيل حركات العهدة والجرد، طباعة' },
  { code: 'markets_officer', title: 'مسؤول متابعة الأسواق', scope: 'الأسواق والسلع والأسعار', permissions: 'عرض، تسجيل السلع، رصد الأسعار والتوافر، طباعة' },
  { code: 'butane_officer', title: 'مسؤول البوتاجاز', scope: 'حصص البوتاجاز والمستفيدين والمقارنات', permissions: 'عرض، تحديث حصص البوتاجاز والمستفيدين، طباعة' },
  { code: 'petroleum_officer', title: 'مسؤول المواد البترولية', scope: 'المواد البترولية وحصص الوقود', permissions: 'عرض، تحديث حصص البنزين والسولار والمستفيدين، طباعة' },
  { code: 'fuel_stations_officer', title: 'مسؤول محطات الوقود', scope: 'محطات الوقود وسجل ٢١ بترول والتفتيش', permissions: 'عرض، تسجيل الحركة اليومية وتفتيش المحطات، طباعة' },
  { code: 'warehouses_distributors_officer', title: 'مسؤول المستودعات والموزعين', scope: 'مستودعات البوتاجاز وسجل الموزعين', permissions: 'عرض، تسجيل حركة المستودعات والموزعين وربط أذون التسليم، طباعة' },
  { code: 'data_entry_clerk', title: 'موظف إدخال بيانات', scope: 'القسم المحدد له', permissions: 'عرض، إدخال مسودات السجلات بدون صلاحية اعتماد نهائي' },
  { code: 'view_only_user', title: 'مستخدم للعرض فقط', scope: 'القرية أو الإدارة المحددة له', permissions: 'عرض الجداول والمؤشرات فقط دون تعديل' },
];

// ==================== كود الهجرة الكامل لقاعدة بيانات Supabase (٣٨ جدولاً مترابطاً) ====================
export const INTERNAL_TRADE_SUPABASE_SQL = `-- =================================================================================
-- منظومة التموين والتجارة الداخلية بالغربية — قاعدة بيانات قسم التجارة الداخلية
-- تشمل ٣٨ جدولاً مترابطاً مع المفاتيح الأجنبية، الفهارس، المعاملات الآمنة، وسياسات RLS
-- Designed & Developed by Eng. Ahmed El-Hosseiny — Tel: 01004414038
-- =================================================================================

-- أولاً: المنشآت والأنشطة والتراخيص (5 جداول)
CREATE TABLE IF NOT EXISTS commercial_establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_code TEXT UNIQUE NOT NULL,
  file_number TEXT NOT NULL,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_national_id TEXT,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  ownership_type TEXT NOT NULL DEFAULT 'ملك',
  detailed_address TEXT NOT NULL,
  governorate TEXT NOT NULL DEFAULT 'الغربية',
  district_center TEXT NOT NULL,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  street TEXT,
  building_number TEXT,
  geo_location TEXT,
  activity_start_date DATE,
  commercial_register_number TEXT,
  commercial_register_expiry_date DATE,
  tax_card_number TEXT,
  tax_card_expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'تعمل',
  category TEXT NOT NULL,
  is_licensed BOOLEAN NOT NULL DEFAULT true,
  has_unregistered_activity BOOLEAN NOT NULL DEFAULT false,
  unregistered_activity_details TEXT,
  last_inspection_date DATE,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commercial_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  nature TEXT NOT NULL,
  requires_license BOOLEAN NOT NULL DEFAULT true,
  competent_authority TEXT NOT NULL,
  required_documents TEXT,
  regulations TEXT,
  status TEXT NOT NULL DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS establishment_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES commercial_establishments(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES commercial_activities(id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_licensed_match BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(establishment_id, activity_id)
);

CREATE TABLE IF NOT EXISTS commercial_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number TEXT UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES commercial_establishments(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL,
  competent_authority TEXT NOT NULL,
  licensed_activity_name TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL,
  file_number TEXT,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  responsible_employee TEXT,
  last_review_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS license_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES commercial_licenses(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ثانياً: الحملات والمخالفات والمحاضر والتصالحات (8 جداول)
CREATE TABLE IF NOT EXISTS inspection_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_number TEXT UNIQUE NOT NULL,
  campaign_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  supply_administration TEXT NOT NULL,
  campaign_scope TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  target_streets_and_areas TEXT,
  campaign_type TEXT NOT NULL,
  campaign_leader TEXT NOT NULL,
  targeted_establishments_count INT NOT NULL DEFAULT 0,
  inspected_establishments_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'منفذة',
  result_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES inspection_campaigns(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_role TEXT NOT NULL,
  authority_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES inspection_campaigns(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES commercial_establishments(id) ON DELETE CASCADE,
  inspection_outcome TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS violation_legal_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decree_or_law_title TEXT NOT NULL,
  article_number TEXT,
  competent_authority TEXT NOT NULL,
  approved_penalty_description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS commercial_violation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT NOT NULL,
  group_title TEXT NOT NULL,
  title TEXT NOT NULL,
  legal_basis_id UUID REFERENCES violation_legal_bases(id),
  legal_basis_snapshot TEXT NOT NULL,
  competent_authority TEXT NOT NULL,
  approved_penalty_measure TEXT NOT NULL,
  has_automatic_financial_fine BOOLEAN NOT NULL DEFAULT false,
  default_base_fine_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'واقعة',
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS commercial_violation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT NOT NULL,
  campaign_id UUID REFERENCES inspection_campaigns(id) ON DELETE SET NULL,
  report_date DATE NOT NULL,
  report_time TEXT,
  establishment_id UUID NOT NULL REFERENCES commercial_establishments(id) ON DELETE RESTRICT,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  inspector_name TEXT NOT NULL,
  competent_case_number TEXT,
  total_fine_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  report_status TEXT NOT NULL DEFAULT 'معتمد',
  is_settled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_number, supply_administration)
);

CREATE TABLE IF NOT EXISTS commercial_violation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES commercial_violation_reports(id) ON DELETE CASCADE,
  violation_type_id UUID REFERENCES commercial_violation_types(id),
  violation_title TEXT NOT NULL,
  detailed_description TEXT,
  seized_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit TEXT,
  fine_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  legal_basis TEXT NOT NULL,
  competent_authority TEXT NOT NULL,
  approved_measure TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS violation_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES commercial_violation_reports(id) ON DELETE RESTRICT,
  settlement_request_number TEXT UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES commercial_establishments(id),
  due_amount_egp NUMERIC(14,2) NOT NULL,
  approved_settlement_amount_egp NUMERIC(14,2) NOT NULL,
  request_date DATE NOT NULL,
  approval_date DATE,
  competent_authority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'طلب مقدم',
  payment_receipt_number TEXT UNIQUE,
  payment_date DATE,
  paid_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  approved_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ثالثاً: المضبوطات والتحفظات التموينية (5 جداول)
CREATE TABLE IF NOT EXISTS seizure_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name TEXT UNIQUE NOT NULL,
  supply_administration TEXT NOT NULL,
  custodian_name TEXT NOT NULL,
  capacity_description TEXT
);

CREATE TABLE IF NOT EXISTS commercial_seizures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seizure_number TEXT UNIQUE NOT NULL,
  report_id UUID NOT NULL REFERENCES commercial_violation_reports(id) ON DELETE RESTRICT,
  campaign_id UUID REFERENCES inspection_campaigns(id),
  seizure_date DATE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES commercial_establishments(id),
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  custody_location TEXT NOT NULL,
  custody_authority TEXT NOT NULL,
  custodian_name TEXT NOT NULL,
  inventory_report_number TEXT NOT NULL,
  legal_status TEXT NOT NULL DEFAULT 'تحت التحفظ',
  custody_expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seizure_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seizure_id UUID NOT NULL REFERENCES commercial_seizures(id) ON DELETE CASCADE,
  commodity_category TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand_name TEXT,
  initial_quantity NUMERIC(14,3) NOT NULL,
  current_actual_balance NUMERIC(14,3) NOT NULL,
  unit TEXT NOT NULL,
  weight_or_volume TEXT,
  estimated_value_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  commodity_condition TEXT NOT NULL,
  seizure_reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seizure_disposal_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seizure_id UUID NOT NULL REFERENCES commercial_seizures(id) ON DELETE RESTRICT,
  decision_number TEXT UNIQUE NOT NULL,
  issuing_authority TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  decision_date DATE NOT NULL,
  decision_summary TEXT NOT NULL,
  approved_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seizure_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_number TEXT UNIQUE NOT NULL,
  seizure_id UUID NOT NULL REFERENCES commercial_seizures(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  unit TEXT NOT NULL,
  movement_date DATE NOT NULL,
  movement_time TEXT NOT NULL,
  delivered_by TEXT NOT NULL,
  received_by TEXT NOT NULL,
  official_decision_reference TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  approved_by TEXT NOT NULL,
  audit_trail_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- رابعاً: الأسواق والسلع والأسعار (4 جداول)
CREATE TABLE IF NOT EXISTS market_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_name TEXT NOT NULL,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  market_day TEXT
);

CREATE TABLE IF NOT EXISTS market_commodities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  brand_name TEXT,
  country_of_origin TEXT,
  commodity_type TEXT NOT NULL,
  is_essential BOOLEAN NOT NULL DEFAULT true,
  is_subject_to_price_regulation BOOLEAN NOT NULL DEFAULT false,
  official_reference_max_price_egp NUMERIC(12,2),
  official_price_decree_ref TEXT,
  official_price_effective_date DATE,
  availability_status TEXT NOT NULL DEFAULT 'متوفر'
);

CREATE TABLE IF NOT EXISTS commodity_price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id UUID NOT NULL REFERENCES market_commodities(id),
  package_or_weight TEXT,
  unit TEXT NOT NULL,
  min_price_egp NUMERIC(12,2) NOT NULL,
  max_price_egp NUMERIC(12,2) NOT NULL,
  avg_price_egp NUMERIC(12,2) NOT NULL,
  announced_price_egp NUMERIC(12,2) NOT NULL,
  observed_price_egp NUMERIC(12,2) NOT NULL,
  official_price_egp NUMERIC(12,2),
  official_price_source_decree TEXT,
  market_name TEXT NOT NULL,
  establishment_name TEXT,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  supply_administration TEXT NOT NULL,
  observation_date DATE NOT NULL,
  inspector_name TEXT NOT NULL,
  price_source TEXT NOT NULL,
  availability_status TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS commodity_availability_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id UUID NOT NULL REFERENCES market_commodities(id),
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  availability_status TEXT NOT NULL,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by TEXT NOT NULL
);

-- خامساً: أسطوانات البوتاجاز والمستودعات والموزعون (6 جداول)
CREATE TABLE IF NOT EXISTS butane_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_administration TEXT NOT NULL,
  district_center TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  population_count INT NOT NULL DEFAULT 0,
  families_count INT NOT NULL DEFAULT 0,
  beneficiaries_count_current INT NOT NULL DEFAULT 0,
  distribution_outlets_count INT NOT NULL DEFAULT 0,
  warehouses_count INT NOT NULL DEFAULT 0,
  allocated_quota_cylinders INT NOT NULL DEFAULT 0,
  received_quantity_cylinders INT NOT NULL DEFAULT 0,
  distributed_quantity_cylinders INT NOT NULL DEFAULT 0,
  remaining_quantity_cylinders INT NOT NULL DEFAULT 0,
  domestic_cylinders_count INT NOT NULL DEFAULT 0,
  commercial_cylinders_count INT NOT NULL DEFAULT 0,
  last_updated_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS butane_beneficiary_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID NOT NULL REFERENCES butane_allocations(id) ON DELETE CASCADE,
  stat_year INT NOT NULL,
  beneficiaries_count INT NOT NULL,
  allocated_cylinders INT NOT NULL,
  received_cylinders INT NOT NULL,
  distributed_cylinders INT NOT NULL,
  remaining_cylinders INT NOT NULL,
  UNIQUE(allocation_id, stat_year)
);

CREATE TABLE IF NOT EXISTS butane_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code TEXT UNIQUE NOT NULL,
  warehouse_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  manager_name TEXT,
  license_number TEXT NOT NULL,
  license_expiry_date DATE,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  storage_capacity_cylinders INT NOT NULL,
  current_cylinders_count INT NOT NULL,
  safety_stock_threshold INT NOT NULL DEFAULT 450,
  operation_status TEXT NOT NULL DEFAULT 'يعمل بانتظام'
);

CREATE TABLE IF NOT EXISTS butane_warehouse_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date DATE NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES butane_warehouses(id),
  opening_balance INT NOT NULL,
  received_quantity INT NOT NULL,
  supply_permit_number TEXT NOT NULL,
  dispensed_quantity INT NOT NULL,
  delivery_permit_to_distributor_no TEXT UNIQUE NOT NULL,
  returned_cylinders_count INT NOT NULL DEFAULT 0,
  excluded_damaged_cylinders_count INT NOT NULL DEFAULT 0,
  closing_balance INT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS butane_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_code TEXT UNIQUE NOT NULL,
  distributor_name TEXT NOT NULL,
  national_id TEXT,
  phone TEXT,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  affiliated_warehouse_id UUID NOT NULL REFERENCES butane_warehouses(id),
  permit_or_license_number TEXT,
  status TEXT NOT NULL DEFAULT 'نشط',
  allocated_cylinders_quota INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS butane_distributor_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date DATE NOT NULL,
  distributor_id UUID NOT NULL REFERENCES butane_distributors(id),
  warehouse_id UUID NOT NULL REFERENCES butane_warehouses(id),
  warehouse_delivery_permit_no TEXT NOT NULL REFERENCES butane_warehouse_movements(delivery_permit_to_distributor_no),
  previous_balance INT NOT NULL,
  received_cylinders INT NOT NULL,
  distributed_cylinders INT NOT NULL,
  returned_cylinders INT NOT NULL DEFAULT 0,
  approved_damaged_cylinders INT NOT NULL DEFAULT 0,
  remaining_balance INT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true
);

-- سادساً: المواد البترولية ومحطات الوقود (7 جداول)
CREATE TABLE IF NOT EXISTS petroleum_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT UNIQUE NOT NULL,
  unit TEXT NOT NULL DEFAULT 'لتر',
  official_price_egp NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS petroleum_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  product_type TEXT NOT NULL,
  beneficiaries_count_current INT NOT NULL DEFAULT 0,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  allocated_quota NUMERIC(14,2) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
  distributed_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'لتر',
  last_updated_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS petroleum_beneficiary_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petroleum_allocation_id UUID NOT NULL REFERENCES petroleum_allocations(id) ON DELETE CASCADE,
  stat_year INT NOT NULL,
  beneficiaries_count INT NOT NULL,
  allocated_quantity NUMERIC(14,2) NOT NULL,
  received_quantity NUMERIC(14,2) NOT NULL,
  distributed_quantity NUMERIC(14,2) NOT NULL,
  remaining_quantity NUMERIC(14,2) NOT NULL,
  UNIQUE(petroleum_allocation_id, stat_year)
);

CREATE TABLE IF NOT EXISTS fuel_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_code TEXT UNIQUE NOT NULL,
  station_name TEXT NOT NULL,
  operating_company TEXT NOT NULL,
  owner_or_manager_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_expiry_date DATE,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  pumps_count INT NOT NULL DEFAULT 4,
  total_tanks_capacity_liters NUMERIC(14,2) NOT NULL,
  safety_threshold_liters NUMERIC(14,2) NOT NULL DEFAULT 8000,
  operation_status TEXT NOT NULL DEFAULT 'تعمل بكامل الطاقة'
);

CREATE TABLE IF NOT EXISTS fuel_station_tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  capacity_liters NUMERIC(14,2) NOT NULL,
  current_balance_liters NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS fuel_station_daily_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date DATE NOT NULL,
  station_id UUID NOT NULL REFERENCES fuel_stations(id),
  product_type TEXT NOT NULL,
  opening_balance_liters NUMERIC(14,2) NOT NULL,
  received_quantity_liters NUMERIC(14,2) NOT NULL,
  supply_permit_number TEXT NOT NULL,
  dispensed_quantity_liters NUMERIC(14,2) NOT NULL,
  approved_adjustments_liters NUMERIC(14,2) NOT NULL DEFAULT 0,
  book_closing_balance_liters NUMERIC(14,2) NOT NULL,
  actual_tank_measurement_liters NUMERIC(14,2) NOT NULL,
  inventory_diff_liters NUMERIC(14,2) NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS fuel_station_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_date DATE NOT NULL,
  inspector_name TEXT NOT NULL,
  station_id UUID NOT NULL REFERENCES fuel_stations(id),
  product_type TEXT NOT NULL,
  meter_reading_observed NUMERIC(14,2) NOT NULL,
  actual_quantity_liters NUMERIC(14,2) NOT NULL,
  book_balance_matched BOOLEAN NOT NULL,
  calibration_status TEXT NOT NULL,
  violations_found TEXT,
  report_number TEXT
);

-- سابعاً: التنبيهات والإعدادات وسجل التدقيق (3 جداول)
CREATE TABLE IF NOT EXISTS internal_trade_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_number TEXT UNIQUE NOT NULL,
  domain_category TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  source_section TEXT NOT NULL,
  linked_record_code TEXT NOT NULL,
  supply_administration TEXT NOT NULL,
  village TEXT NOT NULL,
  severity TEXT NOT NULL,
  responsible_employee TEXT,
  required_action TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'مفتوح',
  closed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal_trade_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_json JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internal_trade_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_record_id TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تفعيل سياسات أمن الصفوف (Supabase RLS)
ALTER TABLE commercial_establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_violation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE violation_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_seizures ENABLE ROW LEVEL SECURITY;
ALTER TABLE seizure_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodity_price_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE butane_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE petroleum_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_station_daily_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_trade_alerts ENABLE ROW LEVEL SECURITY;
`;
