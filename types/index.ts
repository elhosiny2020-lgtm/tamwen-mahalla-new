export type UserRole = 
  | 'super_admin'
  | 'admin'
  | 'directorate_manager'
  | 'deputy_directorate'
  | 'supply_admin_manager'
  | 'supply_deputy'
  | 'department_manager'
  | 'section_head'
  | 'supply_inspector'
  | 'control_inspector'
  | 'bakery_officer'
  | 'debts_officer'
  | 'internal_trade_officer'
  | 'commodities_officer'
  | 'grain_officer'
  | 'hr_officer'
  | 'financial_officer'
  | 'warehouse_officer'
  | 'reports_officer'
  | 'data_entry'
  | 'reviewer'
  | 'collector'
  | 'monitor'
  | 'viewer'
  | 'custom';

export type EmployeeStatus = 'active' | 'seconded' | 'leave' | 'suspended' | 'inactive' | 'pending';

export interface Branch {
  id: string;
  code: string;
  name: string;
  arabicName: string;
  governorate: string;
  isActive: boolean;
  managerName?: string;
  phone?: string;
  address?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  arabicName: string;
  description: string;
  iconName: string;
  isCore: boolean;
}

export interface Permissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  reject: boolean;
  review: boolean;
  print: boolean;
  exportExcel: boolean;
  exportPdf: boolean;
  import: boolean;
  manageUsers: boolean;
  auditLogs: boolean;
  allBranchesAccess: boolean;
}

export interface User {
  id: string;
  fullName: string;
  nationalId: string; // 14 digits
  phone: string; // 11 digits
  email: string;
  username: string;
  password?: string;
  jobTitle: string;
  jobGrade: string;
  workplace: string;
  branchIds: string[];
  primaryBranchId: string;
  departmentIds: string[];
  role: UserRole;
  status: EmployeeStatus;
  employeeNumber?: string;
  customPermissions?: Partial<Record<string, Permissions>>;
  lastLogin?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  createdAt: string;
  createdBy?: string;
}

export interface RegistrationRequest {
  id: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  username: string;
  tempPassword?: string;
  jobTitle: string;
  jobGrade: string;
  workplace: string;
  primaryBranchId: string;
  branchIds: string[];
  requestedRole: UserRole;
  requestedDepartments: string[];
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  notes?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  fullName: string;
  action: string;
  module: string;
  branchId?: string;
  details: string;
  ipAddress: string;
  deviceInfo: string;
  status: 'success' | 'failed' | 'warning';
}

export type DocumentStatusLabel =
  | 'ساري'
  | 'ينتهي خلال 30 يومًا'
  | 'ينتهي خلال 15 يومًا'
  | 'ينتهي خلال 7 أيام'
  | 'ينتهي خلال 3 أيام'
  | 'ينتهي اليوم'
  | 'منتهي'
  | 'لا يوجد مستند'
  | 'يحتاج إلى مراجعة';

export interface BakeryRecord {
  id: string;
  serialNumber: number;
  branchId: string;

  // 1. البيانات الأساسية والموقع
  bakeryNumber: string;
  posNumber: string;
  name: string;
  ownerName: string; // اسم صاحب المخبز
  managerName?: string; // المدير المسؤول
  ownerNationalId: string;
  phone: string; // 11 digits
  village: string; // اسم القرية
  localUnit: string; // اسم الوحدة المحلية التابعة لها
  address: string;
  activityStatus: 'نشط' | 'متوقف' | 'تحت الفحص' | 'مغلق إدارياً';

  // 2. بيانات التشغيل والتصنيف
  breadType: 'بلدي مدعم (ماو)' | 'بلدي مدعم (ملدن)' | 'طباقي' | 'سياحي';
  breadTypesCount: number;
  productionFactor: 660 | 725;
  productionLineType: 'آلي كامل' | 'نصف آلي' | 'يدوي مطور';
  fuelType: 'غاز طبيعي' | 'سولار';
  bakeryCategory: 'ممتاز أ' | 'نموذجي' | 'عادي';
  dailyCapacitySacks: number;
  operationStatus: 'يعمل بكامل الطاقة' | 'يعمل جزئياً' | 'متوقف للصيانة' | 'موقوف تموينياً';
  startDate: string;

  // 3. بيانات الحصص والتأمين
  insuranceAmountEgp: number; // القيمة التأمينية بالجنيه
  sackPriceEgp: number;
  insuranceQuota: number; // عدد الأرغفة المقابلة للحصة التأمينية (أو الحصة التأمينية)
  actualQuota: number; // حصة المخبز الفعلية
  dailySacksCount: number;
  dailyLoavesCount: number; // عدد الأرغفة المقرر حسب نوع الخبز
  remainingDebtEgp: number; // مديونيات المخبز
  totalInsuranceValueEgp: number;
  insuranceStatus: 'مسدد بالكامل' | 'مسدد جزئياً' | 'متأخر السداد' | 'معفى مؤقتاً';

  // 4. بيانات السكان والمستفيدين والمتوسطات
  villagePopulation: number; // عدد السكان
  beneficiaries2023: number; // عدد المستفيدين 2023
  beneficiaries2024: number; // عدد المستفيدين 2024
  beneficiaries2025: number; // عدد المستفيدين 2025
  avgPerCapita2023: number; // متوسط الفرد 2023
  avgPerCapita2024: number; // متوسط الفرد 2024
  avgPerCapita2025: number; // متوسط الفرد 2025
  avgPerCapitaOverall?: number; // متوسط نصيب الفرد للمخبز الواحد
  cumulativeAvgDifference: number; // الفرق التراكمي لمتوسطات 2023 و 2024 و 2025
  dailyShareActual2025: number;

  // 5. المستندات (بدون تاريخ الإصدار للرخصة والبطاقة الضريبية، وبدون بداية العقد)
  licenseNumber: string; // رقم الترخيص
  licenseExpiryDate: string; // تاريخ انتهاء الترخيص
  taxCardNumber: string; // رقم البطاقة الضريبية (تنسيق 123-456-789-012)
  taxCardExpiryDate: string; // تاريخ انتهاء البطاقة الضريبية
  commercialRegisterNumber: string; // رقم السجل التجاري
  commercialRegisterExpiryDate: string; // تاريخ انتهاء السجل التجاري
  leaseContractType: 'تمليك' | 'إيجار'; // نوع عقد المخبز (تمليك أو إيجار)
  leaseContractNumber: string;
  leaseExpiryDate: string; // تاريخ انتهاء عقد الإيجار
  insuranceCheckDetails: string; // بيانات شيك سداد التأمين (رقم الشيك، التاريخ، القيمة، البنك، الحالة)
  documentNotes: string;

  isArchived?: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface BakeryAuditChange {
  id: string;
  bakeryId: string;
  bakeryName: string;
  actionType: 'إضافة مخبز' | 'تعديل بيانات' | 'تعديل حصة' | 'تحديث ترخيص' | 'تحديث عقد' | 'إعادة حساب المعادلات' | 'أرشفة';
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  performedBy: string;
  timestamp: string;
}

export interface BakeryColumnConfig {
  key: string;
  defaultLabel: string;
  customLabel: string;
  groupKey: 'basic' | 'operation' | 'quota' | 'population' | 'documents';
  visible: boolean;
  pinned: boolean;
  width: number;
  order: number;
}

export interface BakeryColumnGroupConfig {
  basic: string;
  operation: string;
  quota: string;
  population: string;
  documents: string;
}

export interface AlertActionRecord {
  id: string;
  bakeryId: string;
  docType: 'license' | 'tax' | 'lease';
  action: 'renewed' | 'postponed' | 'read';
  reason?: string;
  postponedUntil?: string;
  timestamp: string;
  user: string;
}

export interface InspectionRecord {
  id: string;
  recordNumber: string;
  bakeryId: string;
  bakeryName: string;
  village: string;
  type: 'حملة تموينية' | 'مخالفة' | 'محضر رسمي' | 'متابعة دورية';
  date: string;
  inspectorName: string;
  violationTitle: string;
  fineAmountEgp: number;
  status: 'مغلق' | 'قيد التحقيق' | 'محال للنيابة' | 'تم التسوية' | 'مطابق';
  notes: string;
}

export interface DebtTransactionRecord {
  id: string;
  receiptNumber: string;
  bakeryId: string;
  bakeryName: string;
  village: string;
  date: string;
  category: 'مديونية' | 'غرامة' | 'مستحقات مخبز' | 'سداد نقدي / شيك';
  amountEgp: number;
  direction: 'debit' | 'credit'; // debit = يزيد المديونية, credit = يخصم من المديونية
  paymentMethod: string;
  status: 'معتمد' | 'قيد المراجعة' | 'مسدد';
  notes: string;
}

// =========================================================================
// منظومة إدارة مديونيات أصحاب المخابز وحاسبة المخالفات (النظام المالي المتكامل)
// =========================================================================

export type DebtApprovalStatus = 'مسودة' | 'قيد المراجعة' | 'معتمد' | 'مرفوض';
export type DebtPaymentStatus = 'غير مسدد' | 'مسدد جزئيًا' | 'مسدد بالكامل' | 'متأخر';
export type DebtScheduleStatus = 'غير مجدول' | 'مجدول نشط' | 'مكتمل' | 'متعثر' | 'ملغي';

export type DebtItemType =
  | 'قيمة المخالفة'
  | 'المخالفات السابقة'
  | 'الإضافات'
  | 'التصرفات'
  | 'التسويات'
  | 'الخصومات المعتمدة'
  | 'بنود مالية أخرى';

export interface BakeryDebtItem {
  id: string;
  debtId: string;
  itemNumber: string;
  itemType: DebtItemType;
  description: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'مستحق' | 'مسدد جزئيًا' | 'مسدد' | 'ملغي';
  notes: string;
}

export interface BakeryDebtRecord {
  id: string;
  serialNumber: number;
  debtNumber: string;
  bakeryId: string;
  bakeryFileNumber: string;
  bakeryName: string;
  ownerName: string;
  posNumber: string;
  village: string;
  localUnit: string;
  phone: string;
  issuingAuthority: string;
  violationType: string;
  minutesNumber: string;
  violationDate: string;
  dueDate: string;
  description: string;
  notes: string;
  attachmentRef?: string;
  recordedBy: string;
  recordedByUserId?: string;
  approvalStatus: DebtApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  // البنود المالية الأساسية
  originalAmount: number;
  priorViolationsAmount: number;
  additionsAmount: number;
  disposalsAmount: number;
  approvedSettlementsAmount: number;
  advancePaidAmount: number;
  // القيم المحسوبة
  grossBeforeSettlements: number;
  netDueAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  paymentPercentage: number;
  remainingPercentage: number;
  // حالات المتابعة
  paymentStatus: DebtPaymentStatus;
  scheduleStatus: DebtScheduleStatus;
  lastPaymentDate?: string;
  nextInstallmentDate?: string;
  delayDays: number;
  linkedViolationId?: string;
  // حقول نقص الوزن عند ربطها بمخالفة وزن
  breadTypeLabel?: string;
  officialWeightGrams?: number;
  actualWeightGrams?: number;
  shortageGrams?: number;
  weightTierLabel?: string;
  penaltyMultiplier?: number;
  sackPriceAtViolation?: number;
  insuranceQuotaAtViolation?: number;
  baseFineAmount?: number;
  finalFineAmount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type DebtPaymentMethod =
  | 'نقدي'
  | 'تحويل بنكي'
  | 'فودافون كاش'
  | 'إنستاباي'
  | 'دفع إلكتروني'
  | 'طرق أخرى معتمدة';

export interface DebtPaymentRecord {
  id: string;
  paymentNumber: string;
  debtId: string;
  debtNumber: string;
  bakeryId: string;
  bakeryName: string;
  ownerName: string;
  posNumber: string;
  paymentDate: string;
  amount: number;
  paymentKind: 'دفعة كاملة' | 'دفعة جزئية' | 'دفعة مقدمة' | 'دفعة قسط' | 'تسوية / رد معتمد';
  paymentMethod: string;
  receiptNumber: string;
  collectionAuthority: string;
  collectorName: string;
  balanceBefore: number;
  balanceAfter: number;
  status: 'معتمد' | 'قيد المراجعة' | 'ملغي';
  installmentId?: string;
  notes: string;
  approvedBy?: string;
  cancelledBy?: string;
  cancelReason?: string;
  createdAt: string;
}

export type ScheduleFrequencyType =
  | 'سداد أسبوعي'
  | 'سداد شهري'
  | 'سداد كل 15 يومًا'
  | 'سداد بمواعيد مخصصة'
  | 'سداد دفعة واحدة'
  | 'سداد بمبالغ غير متساوية'
  | 'سداد بمبالغ متساوية'
  | 'سداد بمواعيد موسمية وفق اعتماد المسؤول';

export type InstallmentStatus =
  | 'مجدول'
  | 'مستحق اليوم'
  | 'تم السداد'
  | 'مسدد جزئيًا'
  | 'متأخر'
  | 'متأخر جزئيًا'
  | 'مؤجل بموافقة'
  | 'ملغي بقرار معتمد';

export interface DebtInstallmentRecord {
  id: string;
  scheduleId: string;
  scheduleNumber: string;
  installmentSerial: number;
  debtId: string;
  debtNumber: string;
  bakeryId: string;
  bakeryName: string;
  ownerName: string;
  posNumber: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  actualPaidDate?: string;
  delayDays: number;
  status: InstallmentStatus;
  paymentMethod?: string;
  receiptNumber?: string;
  postponeReason?: string;
  notes?: string;
}

export interface DebtSchedulePlan {
  id: string;
  scheduleNumber: string;
  bakeryId: string;
  bakeryName: string;
  ownerName: string;
  posNumber: string;
  debtId: string;
  debtNumber: string;
  totalRemainingAtCreation: number;
  downPayment: number;
  scheduledAmount: number;
  scheduleType: ScheduleFrequencyType;
  startDate: string;
  installmentsCount: number;
  installmentAmount: number;
  firstInstallmentDate: string;
  paymentDayHint: string;
  lastInstallmentDate: string;
  notes: string;
  responsibleUser: string;
  status: 'مسودة' | 'معتمد نشط' | 'مكتمل' | 'متعثر' | 'ملغي';
  createdAt: string;
}

export interface DebtFollowupRecord {
  id: string;
  followupDate: string;
  bakeryId: string;
  bakeryName: string;
  ownerName: string;
  posNumber: string;
  debtId: string;
  debtNumber: string;
  actionType: 'إشعار بقرب موعد السداد' | 'مطالبة بسداد قسط مستحق' | 'إخطار بتأخر السداد' | 'بيان بالمديونية المتبقية' | 'إشعار بمراجعة موقف المديونية' | 'متابعة ميدانية / هاتفية';
  noticeDate: string;
  noticeNumber: string;
  notifyMethod: 'تسليم باليد' | 'اتصال هاتفي' | 'بريد مسجل' | 'توقيع استلام بالإدارة';
  notifyResult: 'تم الإخطار والتعهد بالسداد' | 'قيد المتابعة' | 'طلب تأجيل / جدولة' | 'لم يستجب';
  employeeNotes: string;
  nextAction: string;
  nextFollowupDate: string;
  employeeName: string;
  approvedBy?: string;
  createdAt: string;
}

export interface DebtSettlementRecord {
  id: string;
  debtId: string;
  debtNumber: string;
  bakeryId: string;
  bakeryName: string;
  settlementType: 'تسوية معتمدة' | 'خصم معتمد' | 'رد مبلغ' | 'عكس حركة';
  amount: number;
  reason: string;
  referenceDoc: string;
  createdBy: string;
  approvedBy: string;
  createdAt: string;
}

export interface DebtAuditLogRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  operation:
    | 'إضافة مديونية'
    | 'تعديل مديونية'
    | 'اعتماد مديونية'
    | 'رفض مديونية'
    | 'تسجيل دفعة'
    | 'إلغاء دفعة'
    | 'إنشاء جدول سداد'
    | 'تعديل جدول سداد'
    | 'تأجيل قسط'
    | 'إصدار إشعار'
    | 'تسجيل متابعة'
    | 'تسوية مالية'
    | 'تغيير إعدادات النظام'
    | 'حساب مخالفة'
    | 'اعتماد مخالفة'
    | 'تعديل قاعدة قانونية'
    | 'تسجيل تظلم';
  recordRef: string;
  beforeData: string;
  afterData: string;
  reason: string;
}

export type RiskClassification =
  | 'منتظم'
  | 'يحتاج متابعة'
  | 'متأخر'
  | 'متعثر'
  | 'شديد التعثر';

export type ViolationBreadCategory =
  | 'خبز بلدي مدعم'
  | 'خبز سياحي حر'
  | 'خبز فينو'
  | 'أنواع أخرى وفق الترخيص';

export type ViolationGroupName =
  | 'مخالفات منظومة صرف الخبز'
  | 'مخالفات الدقيق والتصرف في الحصص'
  | 'مخالفات الوزن والجودة'
  | 'مخالفات التشغيل والنظافة'
  | 'مخالفات التفتيش والرقابة';

export type ViolationFormulaKind =
  | 'weight_shortage_175'
  | 'support_cost_daily_sales'
  | 'flour_disposal_value'
  | 'daily_quota_support_cost'
  | 'fixed_per_day'
  | 'fixed_fine'
  | 'tourist_fino_directive_5'
  | 'custom_manual';

export interface ViolationRuleConfig {
  id: string;
  code: string;
  name: string;
  groupName: ViolationGroupName;
  breadCategory: ViolationBreadCategory;
  decreeNumber: string;
  articleRef: string;
  formulaKind: ViolationFormulaKind;
  firstOffenseAmountOrMultiplier: number;
  repeatAmountOrMultiplier: number;
  repeatWindowDays: number;
  closureMeasureFirst: string;
  closureDaysFirst: number;
  closureMeasureRepeat: string;
  closureDaysRepeat: number;
  quotaDeductionPct: number;
  quotaDeductionMonths: number;
  effectiveFrom: string;
  effectiveTo?: string;
  legalSource: string;
  version: number;
  isActive: boolean;
  requiredFields: ('weight' | 'dailySupportCost' | 'flourQtyAndPrice' | 'stopDays' | 'manualAmount')[];
  notes: string;
}

export interface ViolationLegalVersion {
  id: string;
  ruleId: string;
  ruleCode: string;
  version: number;
  decreeNumber: string;
  effectiveFrom: string;
  snapshotSummary: string;
  changedBy: string;
  officialReference: string;
  changedAt: string;
}

export interface BakeryViolationRecord {
  id: string;
  violationNumber: string;
  minutesNumber: string;
  bakeryId: string;
  bakeryName: string;
  ownerName: string;
  posNumber: string;
  village: string;
  localUnit: string;
  phone: string;
  violationDate: string;
  ruleId: string;
  ruleCode: string;
  violationName: string;
  groupName: ViolationGroupName;
  breadCategory: ViolationBreadCategory;
  decreeRef: string;
  articleRef: string;
  // مدخلات نقص الوزن / الحساب
  officialWeightGrams?: number;
  actualWeightGrams?: number;
  shortageGrams?: number;
  shortagePercent?: number;
  weightTier?: number;
  dailyInsuranceQuotaSnapshot?: number;
  flourUnitPriceSnapshot?: number;
  quotaUnitLabel?: string;
  priceUnitLabel?: string;
  dailySupportCostInput?: number;
  flourDisposedQty?: number;
  flourDisposedUnitPrice?: number;
  stopDaysCount?: number;
  // التكرار والنتيجة
  isRepeat: boolean;
  repeatCountInWindow: number;
  priorViolationId?: string;
  priorViolationDate?: string;
  priorMinutesNumber?: string;
  multiplierApplied: number;
  baseAmount: number;
  finalFineAmount: number;
  closureMeasure: string;
  closureDays: number;
  quotaDeductionPct: number;
  quotaDeductionMonths: number;
  calculationSteps: string[];
  legalBasisText: string;
  effectiveRuleDate: string;
  status: DebtApprovalStatus;
  recordedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  linkedDebtId?: string;
  linkedDebtNumber?: string;
  notes: string;
  createdAt: string;
}

export interface ViolationAppealRecord {
  id: string;
  appealNumber: string;
  violationId: string;
  violationNumber: string;
  bakeryId: string;
  bakeryName: string;
  posNumber: string;
  appealDate: string;
  reason: string;
  decisionStatus: 'قيد الفحص' | 'مقبول (تعديل/إلغاء)' | 'مرفوض';
  adjustedAmount?: number;
  decidedBy?: string;
  decisionNotes?: string;
}

export interface DebtModuleSettings {
  authorities: string[];
  violationCategories: string[];
  additionsAndDisposalsTypes: string[];
  paymentMethods: string[];
  scheduleTypes: ScheduleFrequencyType[];
  notifyBeforeDays: number[]; // e.g., [7, 3, 1, 0]
  notifyOverdueDays: number[]; // e.g., [1, 3, 7, 15, 30]
  defaultBaladiWeightGrams: number; // 90
  defaultTouristWeightGrams: number; // 80
  defaultFinoWeightGrams: number; // 60
  defaultFlourSackPriceEgp: number; // 235
  soundEnabled: boolean;
  soundVolume: number;
  enforceSeparationOfDuties: boolean;
  riskThresholds: {
    needsFollowupDays: number;
    lateDays: number;
    defaultedDays: number;
    severelyDefaultedDays: number;
  };
  readNotificationIds: string[];
  snoozedAlerts: Record<string, { untilDate: string; reason: string; approvedBy: string }>;
  favoriteFilters: { id: string; name: string; search: string; status: string; authority: string }[];
  noticeTemplates: Record<string, string>;
}


