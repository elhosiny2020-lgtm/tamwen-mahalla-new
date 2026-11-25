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

