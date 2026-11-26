import {
  Branch,
  Department,
  User,
  RegistrationRequest,
  AuditLog,
  BakeryRecord,
  BakeryAuditChange,
  BakeryColumnConfig,
  BakeryColumnGroupConfig,
  AlertActionRecord,
  InspectionRecord,
  DebtTransactionRecord,
} from '@/types';
import { computeBakeryEquations } from '@/lib/bakery-math';

export const INITIAL_BRANCHES: Branch[] = [
  { id: 'b-01', code: 'TANT-01', name: 'إدارة تموين أول طنطا', arabicName: 'إدارة تموين أول طنطا', governorate: 'الغربية', isActive: true, managerName: 'أ. محمد عبد الحميد', phone: '٠٤٠٣٣٣١١٢٢', address: 'شارع البحر، طنطا' },
  { id: 'b-02', code: 'TANT-02', name: 'إدارة تموين ثان طنطا', arabicName: 'إدارة تموين ثان طنطا', governorate: 'الغربية', isActive: true, managerName: 'أ. سامح إبراهيم', phone: '٠٤٠٣٣٤٥٥٦٦', address: 'منطقة الاستاد، طنطا' },
  { id: 'b-03', code: 'MAH-CTR', name: 'إدارة تموين مركز المحلة الكبرى', arabicName: 'إدارة تموين مركز المحلة الكبرى', governorate: 'الغربية', isActive: true, managerName: 'أ. خالد الشناوي', phone: '٠٤٠٢٢٢٤٤١١', address: 'مجمع المصالح الحكومية، المحلة الكبرى' },
  { id: 'b-04', code: 'MAH-BND', name: 'إدارة تموين بندر المحلة الكبرى', arabicName: 'إدارة تموين بندر المحلة الكبرى', governorate: 'الغربية', isActive: true, managerName: 'أ. هالة مرسي', phone: '٠٤٠٢٢٥٦٦٧٧', address: 'منطقة الجمهورية، المحلة الكبرى' },
  { id: 'b-05', code: 'KZAYAT', name: 'إدارة تموين كفر الزيات', arabicName: 'إدارة تموين كفر الزيات', governorate: 'الغربية', isActive: true, managerName: 'أ. محمود الديب', phone: '٠٤٠٢٥٤١١٢٢', address: 'شارع الجلاء، كفر الزيات' },
  { id: 'b-06', code: 'ZEFTA', name: 'إدارة تموين زفتى', arabicName: 'إدارة تموين زفتى', governorate: 'الغربية', isActive: true, managerName: 'أ. رجب حلمي', phone: '٠٤٠٥٥٦٧٧٨٨', address: 'كورنيش النيل، زفتى' },
  { id: 'b-07', code: 'SANTA', name: 'إدارة تموين السنطة', arabicName: 'إدارة تموين السنطة', governorate: 'الغربية', isActive: true, managerName: 'أ. عادل الجندي', phone: '٠٤٠٥٣٢١١٤٤', address: 'السنطة البلد' },
  { id: 'b-08', code: 'BASYOUN', name: 'إدارة تموين بسيون', arabicName: 'إدارة تموين بسيون', governorate: 'الغربية', isActive: true, managerName: 'أ. طارق الفقي', phone: '٠٤٠٥٧٢٣٣١١', address: 'شارع الجمهورية، بسيون' },
  { id: 'b-09', code: 'QUTOUR', name: 'إدارة تموين قطور', arabicName: 'إدارة تموين قطور', governorate: 'الغربية', isActive: true, managerName: 'أ. ممدوح النحاس', phone: '٠٤٠٥٤٢٦٦٩٩', address: 'ميدان المحطة، قطور' },
  { id: 'b-10', code: 'SAMANN', name: 'إدارة تموين سمنود', arabicName: 'إدارة تموين سمنود', governorate: 'الغربية', isActive: true, managerName: 'أ. وائل بركات', phone: '٠٤٠٥٨١٢٢٣٣', address: 'شارع البحر، سمنود' },
  { id: 'b-11', code: 'HQ-GH', name: 'ديوان عام المديرية', arabicName: 'ديوان عام مديرية التموين بالغربية', governorate: 'الغربية', isActive: true, managerName: 'وكيل وزارة التموين بالغربية', phone: '٠٤٠٣٣٣٠٠٠٠', address: 'مجمع المصالح الحكومية، طنطا' }
];

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'd-01', code: 'DASH', name: 'لوحة التحكم الرئيسية', arabicName: 'لوحة التحكم الرئيسية الموحدة', description: 'المؤشرات الاستراتيجية وغرفة المتابعة المركزية', iconName: 'LayoutDashboard', isCore: true },
  { id: 'd-02', code: 'BAK', name: 'إدارة المخابز', arabicName: 'منظومة الرقابة على المخابز', description: 'إدارة المخابز، المعادلات السبع، التراخيص، العقود، التنبيهات، والطباعة', iconName: 'Flame', isCore: true },
  { id: 'd-03', code: 'DEBTS', name: 'مديونيات أصحاب المخابز', arabicName: 'مديونيات أصحاب المخابز', description: 'إدارة التحصيلات والمديونيات والغرامات التموينية', iconName: 'CreditCard', isCore: true },
  { id: 'd-04', code: 'TRADE', name: 'قسم التجارة الداخلية', arabicName: 'قسم التجارة الداخلية', description: 'إدارة ومتابعة المنشآت التجارية والأسواق والسلع والأنشطة التموينية والمواد البترولية', iconName: 'ShoppingBag', isCore: true },
  { id: 'd-05', code: 'CTRL', name: 'المركز الرقابي الموحد', arabicName: 'المركز الرقابي الموحد', description: 'غرفة العمليات والبلاغات والشكاوى العاجلة', iconName: 'ShieldAlert', isCore: true },
  { id: 'd-06', code: 'GAS', name: 'تداول البوتاجاز والمواد البترولية', arabicName: 'تداول البوتاجاز والمواد البترولية', description: 'مستودعات البوتاجاز ومحطات الوقود', iconName: 'Fuel', isCore: true },
  { id: 'd-07', code: 'COMM', name: 'قسم السلع التموينية', arabicName: 'قسم السلع التموينية', description: 'إدارة السلع التموينية والتجار والحصص والمخازن والبطاقات والمستفيدين والتقارير', iconName: 'Package', isCore: true },
  { id: 'd-08', code: 'GRAIN', name: 'صيانة الحبوب', arabicName: 'صيانة الحبوب والأقماح', description: 'متابعة الأقماح المحلية والمستوردة', iconName: 'Wheat', isCore: true },
  { id: 'd-09', code: 'SILOS', name: 'الشون والصوامع', arabicName: 'الشون والصوامع الهندسية', description: 'السعات التخزينية وتوريد الأقماح', iconName: 'Warehouse', isCore: true },
  { id: 'd-10', code: 'MILLS', name: 'المطاحن', arabicName: 'المطاحن التموينية', description: 'متابعة طحن الدقيق التمويني استخراج ٨٧٫٥٪', iconName: 'Factory', isCore: true },
  { id: 'd-11', code: 'COLD', name: 'الثلاجات', arabicName: 'الثلاجات وحفظ الأغذية', description: 'رقابة السلع الغذائية المجمدة والمبردة', iconName: 'ThermometerSnowflake', isCore: false },
  { id: 'd-12', code: 'HR', name: 'الموارد البشرية', arabicName: 'الموارد البشرية وشؤون العاملين', description: 'ملفات العاملين والانتدابات والإجازات', iconName: 'Users', isCore: true },
  { id: 'd-13', code: 'FIN', name: 'الشؤون المالية والإدارية', arabicName: 'الشؤون المالية والإدارية', description: 'الموازنة والحسابات والمشتريات الحكومية', iconName: 'Calculator', isCore: true },
  { id: 'd-14', code: 'STORE', name: 'المخازن والمشتريات', arabicName: 'المخازن والعهد الحكومية', description: 'إدارة العهد والمستلزمات التشغيلية', iconName: 'Boxes', isCore: false },
  { id: 'd-15', code: 'INSP', name: 'التفتيش والرقابة التموينية', arabicName: 'الحملات والتفتيش التمويني', description: 'تخطيط الحملات الرقابية الميدانية', iconName: 'SearchCheck', isCore: true },
  { id: 'd-16', code: 'VIOL', name: 'المخالفات والمحاضر', arabicName: 'المخالفات والمحاضر والنيابات', description: 'قيد ومتابعة القضايا والمحاضر التموينية', iconName: 'FileText', isCore: true },
  { id: 'd-17', code: 'COMP', name: 'الشكاوى وخدمة المواطنين', arabicName: 'الشكاوى وخدمة المواطنين', description: 'تلقي وفحص شكاوى المواطنين', iconName: 'MessageSquareWarning', isCore: true },
  { id: 'd-18', code: 'REP', name: 'التقارير والإحصائيات', arabicName: 'التقارير والإحصائيات المركزية', description: 'إعداد التقارير الدورية والتحليلية للمديرية', iconName: 'BarChart3', isCore: true },
  { id: 'd-19', code: 'DOCS', name: 'إدارة المستندات والأرشيف', arabicName: 'إدارة المستندات والأرشيف الإلكتروني', description: 'حفظ واسترجاع القرارات الوزارية والكتب الدورية', iconName: 'FolderArchive', isCore: false },
  { id: 'd-20', code: 'SETT', name: 'الإعدادات العامة', arabicName: 'الإعدادات العامة للنظام', description: 'إعدادات المنظومة والربط المؤسسي', iconName: 'Settings', isCore: true },
  { id: 'd-21', code: 'USERS', name: 'إدارة المستخدمين', arabicName: 'إدارة المستخدمين والحسابات', description: 'إنشاء ومتابعة حسابات العاملين', iconName: 'UserCog', isCore: true },
  { id: 'd-22', code: 'ROLES', name: 'إدارة الصلاحيات والأقسام', arabicName: 'إدارة الصلاحيات والفروع الإدارية', description: 'تخصيص أدوار وصلاحيات العاملين حسب الإدارات والأقسام', iconName: 'ShieldCheck', isCore: true },
  { id: 'd-23', code: 'AUDIT', name: 'سجل العمليات والمراجعة', arabicName: 'سجل العمليات والمراجعة الأمنية', description: 'رصد ومراقبة كافة العمليات والتعديلات', iconName: 'History', isCore: true },
  { id: 'd-24', code: 'BACK', name: 'النسخ الاحتياطي والاستعادة', arabicName: 'النسخ الاحتياطي وقواعد البيانات', description: 'إدارة النسخ الاحتياطي وحماية البيانات', iconName: 'Database', isCore: true },
  { id: 'd-25', code: 'TASKS', name: 'إدارة المهام اليومية والمتابعة', arabicName: 'إدارة المهام اليومية والمتابعة', description: 'متابعة المهام اليومية والتكليفات والمتابعة الشاملة للأقسام والمحادثات الداخلية بين الموظفين', iconName: 'SearchCheck', isCore: true },
  { id: 'd-26', code: 'LISTS', name: 'إدارة القوائم المنسدلة', arabicName: 'إدارة القوائم المنسدلة', description: 'تعديل رؤوس أعمدة الجداول وإدارة القرى والوحدات المحلية والبطاقات والتراخيص وتواريخ الانتهاء بالكالندر', iconName: 'ListChecks', isCore: true }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-001',
    fullName: 'Eng. Ahmed El-Hosseiny — Designed & Developed by Eng. Ahmed El-Hosseiny (Tel: 01004414038)',
    nationalId: '28510121601234',
    phone: '01004414038',
    email: 'admin.gharbia@supply.gov.eg',
    username: 'admin',
    jobTitle: 'Designed & Developed by Eng. Ahmed El-Hosseiny — Tel: 01004414038',
    jobGrade: 'درجة أولى أ',
    workplace: 'إدارة تموين مركز المحلة الكبرى - ديوان المديرية',
    branchIds: ['b-01', 'b-02', 'b-03', 'b-04', 'b-05', 'b-06', 'b-07', 'b-08', 'b-09', 'b-10', 'b-11'],
    primaryBranchId: 'b-03',
    departmentIds: INITIAL_DEPARTMENTS.map(d => d.id),
    role: 'super_admin',
    status: 'active',
    employeeNumber: '99001',
    failedLoginAttempts: 0,
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'usr-002',
    fullName: 'أ. خالد محمد الشناوي',
    nationalId: '29005151605678',
    phone: '01012345678',
    email: 'mahalla.mgr@supply.gov.eg',
    username: 'mahalla_manager',
    jobTitle: 'مدير إدارة تموين مركز المحلة الكبرى',
    jobGrade: 'مدير عام',
    workplace: 'إدارة تموين مركز المحلة الكبرى',
    branchIds: ['b-03', 'b-04'],
    primaryBranchId: 'b-03',
    departmentIds: ['d-01', 'd-02', 'd-03', 'd-04', 'd-05', 'd-06', 'd-07', 'd-15', 'd-16', 'd-17', 'd-18', 'd-25', 'd-26'],
    role: 'supply_admin_manager',
    status: 'active',
    employeeNumber: '44102',
    failedLoginAttempts: 0,
    createdAt: '2026-01-05T10:30:00Z'
  }
];

const RAW_INITIAL_BAKERIES: Partial<BakeryRecord>[] = [
  {
    id: 'bak-101',
    serialNumber: 1,
    branchId: 'b-03',
    bakeryNumber: '1042',
    posNumber: 'POS-884102',
    name: 'مخبز الفتح الآلي المطور',
    ownerName: 'محمد عبد الله إبراهيم',
    managerName: 'أ. صبري الشناوي',
    ownerNationalId: '27506121601123',
    phone: '01001234567',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    address: 'شارع الجمهورية - قرية صفط تراب - مركز المحلة الكبرى',
    activityStatus: 'نشط',
    breadType: 'بلدي مدعم (ماو)',
    breadTypesCount: 1,
    productionFactor: 660,
    productionLineType: 'آلي كامل',
    fuelType: 'غاز طبيعي',
    bakeryCategory: 'ممتاز أ',
    dailyCapacitySacks: 45,
    operationStatus: 'يعمل بكامل الطاقة',
    startDate: '2015-03-15',
    insuranceAmountEgp: 24675,
    sackPriceEgp: 235,
    actualQuota: 35,
    dailySacksCount: 35,
    remainingDebtEgp: 0,
    insuranceStatus: 'مسدد بالكامل',
    villagePopulation: 42500,
    beneficiaries2023: 11200,
    beneficiaries2024: 11550,
    beneficiaries2025: 11900,
    licenseNumber: 'ر.م/1042/محلة',
    licenseExpiryDate: '2027-06-30',
    taxCardNumber: '412-854-963',
    taxCardExpiryDate: '2027-05-01',
    commercialRegisterNumber: '74125 محلة',
    commercialRegisterExpiryDate: '2027-04-15',
    leaseContractType: 'تمليك',
    leaseContractNumber: 'عقد ملكية مسجل 412',
    leaseExpiryDate: '2035-12-31',
    insuranceCheckDetails: 'شيك رقم 44120 - تاريخ 2026-01-10 - قيمة 24675 ج.م - بنك مصر - مسدد بالكامل',
    documentNotes: 'جميع المستندات سارية ومطابقة للاشتراطات التموينية',
    createdBy: 'admin',
    createdAt: '2026-02-10T09:00:00Z',
  },
  {
    id: 'bak-102',
    serialNumber: 2,
    branchId: 'b-03',
    bakeryNumber: '1085',
    posNumber: 'POS-884195',
    name: 'مخبز النور المحمدي البلدي',
    ownerName: 'إبراهيم السيد أبو العلا',
    managerName: 'أ. محمود البهي',
    ownerNationalId: '27908221602314',
    phone: '01224587963',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    address: 'طريق المحلة طنطا الفرعي - مدخل قرية الهياتم',
    activityStatus: 'نشط',
    breadType: 'بلدي مدعم (ملدن)',
    breadTypesCount: 2,
    productionFactor: 725,
    productionLineType: 'نصف آلي',
    fuelType: 'غاز طبيعي',
    bakeryCategory: 'نموذجي',
    dailyCapacitySacks: 32,
    operationStatus: 'يعمل بكامل الطاقة',
    startDate: '2016-09-01',
    insuranceAmountEgp: 19740,
    sackPriceEgp: 235,
    actualQuota: 28,
    dailySacksCount: 28,
    remainingDebtEgp: 1450,
    insuranceStatus: 'مسدد جزئياً',
    villagePopulation: 38900,
    beneficiaries2023: 9400,
    beneficiaries2024: 9750,
    beneficiaries2025: 10120,
    licenseNumber: 'ر.م/1085/محلة',
    licenseExpiryDate: '2026-12-08',
    taxCardNumber: '528-741-369',
    taxCardExpiryDate: '2026-11-29',
    commercialRegisterNumber: '85214 محلة',
    commercialRegisterExpiryDate: '2027-03-20',
    leaseContractType: 'إيجار',
    leaseContractNumber: 'إيجار 882/ب شهر عقاري المحلة',
    leaseExpiryDate: '2026-12-20',
    insuranceCheckDetails: 'شيك رقم 90124 - تاريخ 2026-02-01 - قيمة 19740 ج.م - البنك الأهلي - مسدد جزئياً',
    documentNotes: 'تنبيه: البطاقة الضريبية والترخيص قاربا على الانتهاء ويلزم التجديد',
    createdBy: 'admin',
    createdAt: '2026-02-12T10:15:00Z',
  },
  {
    id: 'bak-103',
    serialNumber: 3,
    branchId: 'b-03',
    bakeryNumber: '1120',
    posNumber: 'POS-884231',
    name: 'مخبز الإخلاص التعاوني',
    ownerName: 'سامي مرسي عبد الجواد',
    managerName: 'أ. نبيل الفخراني',
    ownerNationalId: '28103191603541',
    phone: '01114578962',
    village: 'البنوان',
    localUnit: 'الوحدة المحلية بالالبنوان',
    address: 'شارع الجمعية الزراعية - البنوان',
    activityStatus: 'نشط',
    breadType: 'بلدي مدعم (ماو)',
    breadTypesCount: 1,
    productionFactor: 660,
    productionLineType: 'نصف آلي',
    fuelType: 'سولار',
    bakeryCategory: 'نموذجي',
    dailyCapacitySacks: 25,
    operationStatus: 'يعمل بكامل الطاقة',
    startDate: '2012-06-20',
    insuranceAmountEgp: 15510,
    sackPriceEgp: 235,
    actualQuota: 22,
    dailySacksCount: 22,
    remainingDebtEgp: 0,
    insuranceStatus: 'مسدد بالكامل',
    villagePopulation: 31200,
    beneficiaries2023: 7500,
    beneficiaries2024: 7820,
    beneficiaries2025: 8050,
    licenseNumber: 'ر.م/1120/محلة',
    licenseExpiryDate: '2026-10-15',
    taxCardNumber: '631-951-753',
    taxCardExpiryDate: '2027-01-15',
    commercialRegisterNumber: '91203 محلة',
    commercialRegisterExpiryDate: '2027-08-10',
    leaseContractType: 'إيجار',
    leaseContractNumber: 'إيجار 304/ج المحلة',
    leaseExpiryDate: '2026-11-26',
    insuranceCheckDetails: 'شيك رقم 11025 - تاريخ 2026-01-15 - قيمة 15510 ج.م - بنك الإسكندرية - مسدد بالكامل',
    documentNotes: 'رخصة المخبز منتهية وتم توجيه إنذار رسمي للتجديد الفوري',
    createdBy: 'admin',
    createdAt: '2026-02-14T11:30:00Z',
  },
  {
    id: 'bak-104',
    serialNumber: 4,
    branchId: 'b-03',
    bakeryNumber: '1154',
    posNumber: 'POS-884309',
    name: 'مخبز الهدى والنور الآلي',
    ownerName: 'مصطفى كمال الديب',
    managerName: 'أ. حامد السعدني',
    ownerNationalId: '27611041604128',
    phone: '01007894561',
    village: 'محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    address: 'شارع البحر - محلة أبو علي - مركز المحلة الكبرى',
    activityStatus: 'نشط',
    breadType: 'بلدي مدعم (ملدن)',
    breadTypesCount: 1,
    productionFactor: 725,
    productionLineType: 'آلي كامل',
    fuelType: 'غاز طبيعي',
    bakeryCategory: 'ممتاز أ',
    dailyCapacitySacks: 50,
    operationStatus: 'يعمل بكامل الطاقة',
    startDate: '2018-01-10',
    insuranceAmountEgp: 28200,
    sackPriceEgp: 235,
    actualQuota: 40,
    dailySacksCount: 40,
    remainingDebtEgp: 0,
    insuranceStatus: 'مسدد بالكامل',
    villagePopulation: 48000,
    beneficiaries2023: 13500,
    beneficiaries2024: 13900,
    beneficiaries2025: 14450,
    licenseNumber: 'ر.م/1154/محلة',
    licenseExpiryDate: '2028-02-01',
    taxCardNumber: '745-852-147',
    taxCardExpiryDate: '2028-03-10',
    commercialRegisterNumber: '10452 محلة',
    commercialRegisterExpiryDate: '2028-03-10',
    leaseContractType: 'تمليك',
    leaseContractNumber: 'ملكية مسجلة 901',
    leaseExpiryDate: '2040-06-01',
    insuranceCheckDetails: 'شيك رقم 77402 - تاريخ 2026-01-05 - قيمة 28200 ج.م - بنك مصر - مسدد بالكامل',
    documentNotes: 'مخبز نموذجي عالي الإنتاجية',
    createdBy: 'admin',
    createdAt: '2026-02-18T08:45:00Z',
  },
  {
    id: 'bak-105',
    serialNumber: 5,
    branchId: 'b-03',
    bakeryNumber: '1198',
    posNumber: 'POS-884412',
    name: 'مخبز البركة البلدي',
    ownerName: 'حسنين محمود الجندي',
    managerName: 'أ. سعيد النجار',
    ownerNationalId: '26904181601987',
    phone: '01554789632',
    village: 'بشبيش',
    localUnit: 'الوحدة المحلية ببشبيش',
    address: 'الشارع العمومي - قرية بشبيش - مركز المحلة الكبرى',
    activityStatus: 'متوقف',
    breadType: 'بلدي مدعم (ماو)',
    breadTypesCount: 1,
    productionFactor: 660,
    productionLineType: 'نصف آلي',
    fuelType: 'سولار',
    bakeryCategory: 'عادي',
    dailyCapacitySacks: 20,
    operationStatus: 'متوقف للصيانة',
    startDate: '2010-05-12',
    insuranceAmountEgp: 11280,
    sackPriceEgp: 235,
    actualQuota: 16,
    dailySacksCount: 16,
    remainingDebtEgp: 4200,
    insuranceStatus: 'متأخر السداد',
    villagePopulation: 44100,
    beneficiaries2023: 5600,
    beneficiaries2024: 5750,
    beneficiaries2025: 5900,
    licenseNumber: 'ر.م/1198/محلة',
    licenseExpiryDate: '2026-11-24',
    taxCardNumber: '852-369-147',
    taxCardExpiryDate: '2026-09-01',
    commercialRegisterNumber: '',
    commercialRegisterExpiryDate: '',
    leaseContractType: 'إيجار',
    leaseContractNumber: 'عقد 114 بشبيش',
    leaseExpiryDate: '2026-11-10',
    insuranceCheckDetails: 'شيك متأخر رقم 3012 - تاريخ 2025-12-01 - قيمة 11280 ج.م - البنك الزراعي - متأخر',
    documentNotes: 'المخبز متوقف للصيانة وعليه مستندات منتهية وبيانات سجل تجاري ناقصة',
    createdBy: 'admin',
    createdAt: '2026-02-20T12:00:00Z',
  },
  {
    id: 'bak-106',
    serialNumber: 6,
    branchId: 'b-03',
    bakeryNumber: '1230',
    posNumber: 'POS-884501',
    name: 'مخبز التيسير الحديث',
    ownerName: 'طارق عبد العزيز الفقي',
    managerName: 'أ. وليد المليجي',
    ownerNationalId: '28307251602845',
    phone: '01065478912',
    village: 'شبرا بابل',
    localUnit: 'الوحدة المحلية بشبرا بابل',
    address: 'ميدان المحطة - شبرا بابل - المحلة الكبرى',
    activityStatus: 'نشط',
    breadType: 'بلدي مدعم (ملدن)',
    breadTypesCount: 1,
    productionFactor: 725,
    productionLineType: 'آلي كامل',
    fuelType: 'غاز طبيعي',
    bakeryCategory: 'نموذجي',
    dailyCapacitySacks: 35,
    operationStatus: 'يعمل بكامل الطاقة',
    startDate: '2019-11-01',
    insuranceAmountEgp: 21150,
    sackPriceEgp: 235,
    actualQuota: 30,
    dailySacksCount: 30,
    remainingDebtEgp: 0,
    insuranceStatus: 'مسدد بالكامل',
    villagePopulation: 35600,
    beneficiaries2023: 10100,
    beneficiaries2024: 10450,
    beneficiaries2025: 10850,
    licenseNumber: 'ر.م/1230/محلة',
    licenseExpiryDate: '2027-01-01',
    taxCardNumber: '963-147-258',
    taxCardExpiryDate: '2027-02-01',
    commercialRegisterNumber: '11542 محلة',
    commercialRegisterExpiryDate: '2027-02-01',
    leaseContractType: 'إيجار',
    leaseContractNumber: 'عقد 612 شهر عقاري',
    leaseExpiryDate: '2026-12-18',
    insuranceCheckDetails: 'شيك رقم 55210 - تاريخ 2026-01-20 - قيمة 21150 ج.م - بنك الإسكندرية - مسدد بالكامل',
    documentNotes: 'منتظم في الصرف والإنتاج اليومي',
    createdBy: 'admin',
    createdAt: '2026-02-22T09:30:00Z',
  }
];

export const INITIAL_BAKERIES: BakeryRecord[] = RAW_INITIAL_BAKERIES.map(b => computeBakeryEquations(b) as BakeryRecord);

export const DEFAULT_BAKERY_COLUMN_GROUPS: BakeryColumnGroupConfig = {
  basic: 'البيانات الأساسية والموقع',
  operation: 'التشغيل والتصنيف',
  quota: 'الحصص والتأمين والمديونيات',
  population: 'السكان والمستفيدين والمتوسطات (٢٠٢٣-٢٠٢٥)',
  documents: 'التراخيص والعقود والمستندات',
};

// Exact 49 Ordered Columns Organized into 5 Logical Groups (DB keys strictly preserved)
export const DEFAULT_BAKERY_COLUMNS: BakeryColumnConfig[] = [
  // Group 1: البيانات الأساسية والموقع (11 عموداً)
  { key: 'serialNumber', defaultLabel: 'المسلسل', customLabel: 'م', groupKey: 'basic', visible: true, pinned: true, width: 44, order: 1 },
  { key: 'bakeryNumber', defaultLabel: 'رقم المخبز', customLabel: 'رقم المخبز', groupKey: 'basic', visible: true, pinned: true, width: 78, order: 2 },
  { key: 'name', defaultLabel: 'اسم المخبز', customLabel: 'اسم المخبز', groupKey: 'basic', visible: true, pinned: true, width: 130, order: 3 },
  { key: 'ownerName', defaultLabel: 'اسم صاحب المخبز', customLabel: 'صاحب المخبز', groupKey: 'basic', visible: true, pinned: false, width: 122, order: 4 },
  { key: 'managerName', defaultLabel: 'المدير المسؤول', customLabel: 'المدير المسؤول', groupKey: 'basic', visible: true, pinned: false, width: 108, order: 5 },
  { key: 'ownerNationalId', defaultLabel: 'الرقم القومي لصاحب المخبز', customLabel: 'الرقم القومي', groupKey: 'basic', visible: true, pinned: false, width: 118, order: 6 },
  { key: 'posNumber', defaultLabel: 'رقم الماكينة', customLabel: 'رقم الماكينة', groupKey: 'basic', visible: true, pinned: false, width: 96, order: 7 },
  { key: 'phone', defaultLabel: 'رقم التليفون', customLabel: 'التليفون', groupKey: 'basic', visible: true, pinned: false, width: 96, order: 8 },
  { key: 'village', defaultLabel: 'اسم القرية', customLabel: 'القرية', groupKey: 'basic', visible: true, pinned: false, width: 88, order: 9 },
  { key: 'localUnit', defaultLabel: 'اسم الوحدة المحلية التابعة لها', customLabel: 'الوحدة المحلية', groupKey: 'basic', visible: true, pinned: false, width: 106, order: 10 },
  { key: 'address', defaultLabel: 'العنوان التفصيلي', customLabel: 'العنوان', groupKey: 'basic', visible: true, pinned: false, width: 135, order: 11 },

  // Group 2: التشغيل والتصنيف (9 أعمدة)
  { key: 'activityStatus', defaultLabel: 'نشاط المخبز', customLabel: 'النشاط', groupKey: 'operation', visible: true, pinned: false, width: 74, order: 12 },
  { key: 'operationStatus', defaultLabel: 'حالة التشغيل اليومي', customLabel: 'حالة التشغيل', groupKey: 'operation', visible: true, pinned: false, width: 102, order: 13 },
  { key: 'breadType', defaultLabel: 'نوع الخبز', customLabel: 'نوع الخبز', groupKey: 'operation', visible: true, pinned: false, width: 98, order: 14 },
  { key: 'productionFactor', defaultLabel: 'معامل الإنتاج لكل شيكارة', customLabel: 'معامل الإنتاج', groupKey: 'operation', visible: true, pinned: false, width: 78, order: 15 },
  { key: 'productionLineType', defaultLabel: 'نوع خط الإنتاج', customLabel: 'خط الإنتاج', groupKey: 'operation', visible: true, pinned: false, width: 82, order: 16 },
  { key: 'fuelType', defaultLabel: 'نوع الوقود', customLabel: 'الوقود', groupKey: 'operation', visible: true, pinned: false, width: 74, order: 17 },
  { key: 'bakeryCategory', defaultLabel: 'فئة وتصنيف المخبز', customLabel: 'التصنيف', groupKey: 'operation', visible: true, pinned: false, width: 74, order: 18 },
  { key: 'dailyCapacitySacks', defaultLabel: 'الطاقة الإنتاجية القصوى (شيكارة)', customLabel: 'الطاقة القصوى', groupKey: 'operation', visible: true, pinned: false, width: 80, order: 19 },
  { key: 'startDate', defaultLabel: 'تاريخ بداية التشغيل', customLabel: 'بداية التشغيل', groupKey: 'operation', visible: true, pinned: false, width: 88, order: 20 },

  // Group 3: الحصص والتأمين والمديونيات (10 أعمدة)
  { key: 'insuranceAmountEgp', defaultLabel: 'القيمة التأمينية بالجنيه', customLabel: 'القيمة التأمينية', groupKey: 'quota', visible: true, pinned: false, width: 94, order: 21 },
  { key: 'sackPriceEgp', defaultLabel: 'سعر الشيكارة التأميني', customLabel: 'سعر الشيكارة', groupKey: 'quota', visible: true, pinned: false, width: 80, order: 22 },
  { key: 'insuranceQuota', defaultLabel: 'الحصة التأمينية (شيكارة)', customLabel: 'الحصة التأمينية', groupKey: 'quota', visible: true, pinned: false, width: 84, order: 23 },
  { key: 'actualQuota', defaultLabel: 'حصة المخبز الفعلية', customLabel: 'الحصة الفعلية', groupKey: 'quota', visible: true, pinned: false, width: 78, order: 24 },
  { key: 'dailySacksCount', defaultLabel: 'عدد الشكائر اليومية', customLabel: 'الشكائر اليومية', groupKey: 'quota', visible: true, pinned: false, width: 78, order: 25 },
  { key: 'dailyLoavesCount', defaultLabel: 'عدد الأرغفة المقرر حسب نوع الخبز', customLabel: 'الأرغفة اليومية', groupKey: 'quota', visible: true, pinned: false, width: 88, order: 26 },
  { key: 'totalInsuranceValueEgp', defaultLabel: 'إجمالي قيمة التأمين المقررة', customLabel: 'إجمالي التأمين', groupKey: 'quota', visible: true, pinned: false, width: 94, order: 27 },
  { key: 'remainingDebtEgp', defaultLabel: 'مديونيات المخبز', customLabel: 'المديونيات', groupKey: 'quota', visible: true, pinned: false, width: 90, order: 28 },
  { key: 'insuranceStatus', defaultLabel: 'حالة سداد التأمين', customLabel: 'حالة التأمين', groupKey: 'quota', visible: true, pinned: false, width: 96, order: 29 },
  { key: 'insuranceCheckDetails', defaultLabel: 'بيانات شيك سداد التأمين', customLabel: 'شيك التأمين', groupKey: 'quota', visible: true, pinned: false, width: 130, order: 30 },

  // Group 4: السكان والمستفيدين والمتوسطات 2023-2025 (10 أعمدة)
  { key: 'villagePopulation', defaultLabel: 'عدد السكان', customLabel: 'السكان', groupKey: 'population', visible: true, pinned: false, width: 78, order: 31 },
  { key: 'beneficiaries2023', defaultLabel: 'عدد المستفيدين عام ٢٠٢٣', customLabel: 'المستفيدين ٢٠٢٣', groupKey: 'population', visible: true, pinned: false, width: 74, order: 32 },
  { key: 'beneficiaries2024', defaultLabel: 'عدد المستفيدين عام ٢٠٢٤', customLabel: 'المستفيدين ٢٠٢٤', groupKey: 'population', visible: true, pinned: false, width: 74, order: 33 },
  { key: 'beneficiaries2025', defaultLabel: 'عدد المستفيدين عام ٢٠٢٥', customLabel: 'المستفيدين ٢٠٢٥', groupKey: 'population', visible: true, pinned: false, width: 74, order: 34 },
  { key: 'avgPerCapitaOverall', defaultLabel: 'متوسط نصيب الفرد للمخبز الواحد', customLabel: 'متوسط الفرد', groupKey: 'population', visible: true, pinned: false, width: 76, order: 35 },
  { key: 'avgPerCapita2023', defaultLabel: 'متوسط نصيب الفرد للمستفيدين عام ٢٠٢٣', customLabel: 'متوسط ٢٠٢٣', groupKey: 'population', visible: true, pinned: false, width: 72, order: 36 },
  { key: 'avgPerCapita2024', defaultLabel: 'متوسط نصيب الفرد للمستفيدين عام ٢٠٢٤', customLabel: 'متوسط ٢٠٢٤', groupKey: 'population', visible: true, pinned: false, width: 72, order: 37 },
  { key: 'avgPerCapita2025', defaultLabel: 'متوسط نصيب الفرد للمستفيدين عام ٢٠٢٥', customLabel: 'متوسط ٢٠٢٥', groupKey: 'population', visible: true, pinned: false, width: 72, order: 38 },
  { key: 'cumulativeAvgDifference', defaultLabel: 'الفرق التراكمي لمتوسطات أعوام ٢٠٢٣ و٢٠٢٤ و٢٠٢٥', customLabel: 'الفرق التراكمي', groupKey: 'population', visible: true, pinned: false, width: 80, order: 39 },
  { key: 'dailyShareActual2025', defaultLabel: 'النصيب اليومي الفعلي ٢٠٢٥', customLabel: 'النصيب الفعلي', groupKey: 'population', visible: true, pinned: false, width: 80, order: 40 },

  // Group 5: التراخيص والعقود والمستندات (9 أعمدة)
  { key: 'licenseNumber', defaultLabel: 'رقم الترخيص', customLabel: 'رقم الترخيص', groupKey: 'documents', visible: true, pinned: false, width: 92, order: 41 },
  { key: 'licenseExpiryDate', defaultLabel: 'تاريخ انتهاء الترخيص', customLabel: 'انتهاء الترخيص', groupKey: 'documents', visible: true, pinned: false, width: 126, order: 42 },
  { key: 'taxCardNumber', defaultLabel: 'رقم البطاقة الضريبية', customLabel: 'البطاقة الضريبية', groupKey: 'documents', visible: true, pinned: false, width: 104, order: 43 },
  { key: 'taxCardExpiryDate', defaultLabel: 'تاريخ انتهاء البطاقة الضريبية', customLabel: 'انتهاء الضريبية', groupKey: 'documents', visible: true, pinned: false, width: 88, order: 44 },
  { key: 'commercialRegisterNumber', defaultLabel: 'رقم السجل التجاري', customLabel: 'السجل التجاري', groupKey: 'documents', visible: true, pinned: false, width: 96, order: 45 },
  { key: 'commercialRegisterExpiryDate', defaultLabel: 'تاريخ انتهاء السجل التجاري', customLabel: 'انتهاء السجل', groupKey: 'documents', visible: true, pinned: false, width: 88, order: 46 },
  { key: 'leaseContractType', defaultLabel: 'نوع عقد المخبز (تمليك أو إيجار)', customLabel: 'نوع العقد', groupKey: 'documents', visible: true, pinned: false, width: 74, order: 47 },
  { key: 'leaseContractNumber', defaultLabel: 'رقم عقد الملكية / الإيجار', customLabel: 'رقم العقد', groupKey: 'documents', visible: true, pinned: false, width: 112, order: 48 },
  { key: 'leaseExpiryDate', defaultLabel: 'تاريخ انتهاء عقد الإيجار', customLabel: 'انتهاء العقد', groupKey: 'documents', visible: true, pinned: false, width: 88, order: 49 },
];

export const INITIAL_BAKERY_AUDIT_CHANGES: BakeryAuditChange[] = [
  {
    id: 'baud-01',
    bakeryId: 'bak-101',
    bakeryName: 'مخبز الفتح الآلي المطور',
    actionType: 'إعادة حساب المعادلات',
    fieldName: 'المعادلات الحسابية السبع',
    oldValue: 'مراجعة دورية',
    newValue: 'تم اعتماد الحصة التأمينية 35.000 والأرغفة اليومية 23100',
    reason: 'مطابقة المعادلات المعتمدة لإدارة تموين مركز المحلة الكبرى',
    performedBy: 'Eng. Ahmed El-Hosseiny — Tel: 01004414038',
    timestamp: '2026-11-25T07:00:00.000Z',
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-101',
    timestamp: '2026-11-25T09:00:00.000Z',
    userId: 'usr-001',
    username: 'admin',
    fullName: 'Designed & Developed by Eng. Ahmed El-Hosseiny — Tel: 01004414038',
    action: 'تفعيل منظومة المخابز المركزية',
    module: 'إدارة المخابز - مركز المحلة الكبرى',
    branchId: 'b-03',
    details: 'تم تحديث المعادلات السبع وجداول التراخيص والعقود والتنبيهات الصوتية',
    ipAddress: '10.20.30.40',
    deviceInfo: 'محطة عمل إدارية — نظام التشغيل ويندوز ١١',
    status: 'success'
  }
];

export const INITIAL_REGISTRATION_REQUESTS: RegistrationRequest[] = [
  {
    id: 'req-01',
    fullName: 'أ. سامح السيد غازي',
    nationalId: '29302141604455',
    phone: '01112223344',
    email: 'sameh.ghazi@supply.gov.eg',
    username: 'sameh_ghazi',
    jobTitle: 'مفتش تموين مخابز أول',
    jobGrade: 'درجة ثانية',
    workplace: 'إدارة تموين مركز المحلة الكبرى',
    primaryBranchId: 'b-03',
    branchIds: ['b-03'],
    requestedRole: 'bakery_officer',
    requestedDepartments: ['d-01', 'd-02', 'd-03', 'd-18'],
    status: 'pending',
    createdAt: '2026-11-25T05:00:00.000Z'
  }
];

export const DEFAULT_LAST_RECALC_TIMESTAMP = '2026-11-25T09:00:00.000Z';

export const INITIAL_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'ins-01',
    recordNumber: 'محضر-2026-104',
    bakeryId: 'bak-102',
    bakeryName: 'مخبز النور البلدي',
    village: 'محلة أبو علي',
    type: 'مخالفة',
    date: '2026-11-18',
    inspectorName: 'أ. سامح السيد غازي',
    violationTitle: 'نقص وزن الرغيف بمقدار 12 جراماً عن المقرر',
    fineAmountEgp: 4500,
    status: 'قيد التحقيق',
    notes: 'تم أخذ عينات وإثبات الواقعة في محضر رسمي وإخطار الإدارة',
  },
  {
    id: 'ins-02',
    recordNumber: 'حملة-2026-089',
    bakeryId: 'bak-101',
    bakeryName: 'مخبز الفتح الآلي المطور',
    village: 'صفط تراب',
    type: 'حملة تموينية',
    date: '2026-11-20',
    inspectorName: 'أ. مروة محمود عبد الله',
    violationTitle: 'مرور رقابي مفاجئ — مطابقة كاملة للأوزان والنظافة والرصيد',
    fineAmountEgp: 0,
    status: 'مطابق',
    notes: 'الماكينة تعمل بانتظام والدقيق مطابق للمواصفات القياسية',
  },
  {
    id: 'ins-03',
    recordNumber: 'محضر-2026-112',
    bakeryId: 'bak-104',
    bakeryName: 'مخبز الرحمة الحديث',
    village: 'شبرابابل',
    type: 'محضر رسمي',
    date: '2026-11-14',
    inspectorName: 'أ. طارق عبد الحميد',
    violationTitle: 'عدم وجود سجل زيارات وعدم الإعلان عن مواعيد التشغيل',
    fineAmountEgp: 2200,
    status: 'محال للنيابة',
    notes: 'تم تحرير المحضر وقيده بقسم الشرطة المختص',
  },
  {
    id: 'ins-04',
    recordNumber: 'متابعة-2026-205',
    bakeryId: 'bak-103',
    bakeryName: 'مخبز السلام المطور',
    village: 'الجابرية',
    type: 'متابعة دورية',
    date: '2026-11-22',
    inspectorName: 'أ. سامح السيد غازي',
    violationTitle: 'توقف مؤقت لصيانة السير مع إخطار مسبق للإدارة',
    fineAmountEgp: 0,
    status: 'مغلق',
    notes: 'تمت مراجعة طلب الصيانة وتوجيه الحصة لأقرب مخبز بالقرية',
  },
  {
    id: 'ins-05',
    recordNumber: 'محضر-2026-119',
    bakeryId: 'bak-105',
    bakeryName: 'مخبز البركة البلدي',
    village: 'الهياتم',
    type: 'مخالفة',
    date: '2026-11-10',
    inspectorName: 'أ. مروة محمود عبد الله',
    violationTitle: 'التصرف في 3 شكائر دقيق بلدي مدعم دون وجه حق',
    fineAmountEgp: 8400,
    status: 'تم التسوية',
    notes: 'تم سداد الغرامة المقررة بإيصال رسمي وتحديث كشف حساب المخبز',
  },
];

export const INITIAL_DEBT_TRANSACTIONS: DebtTransactionRecord[] = [
  {
    id: 'dbt-01',
    receiptNumber: 'إيصال-88410',
    bakeryId: 'bak-101',
    bakeryName: 'مخبز الفتح الآلي المطور',
    village: 'صفط تراب',
    date: '2026-11-05',
    category: 'سداد نقدي / شيك',
    amountEgp: 24675,
    direction: 'credit',
    paymentMethod: 'شيك بنكي - البنك الأهلي',
    status: 'مسدد',
    notes: 'سداد كامل قيمة التأمين للحصة المعتمدة',
  },
  {
    id: 'dbt-02',
    receiptNumber: 'غرامة-2026-104',
    bakeryId: 'bak-102',
    bakeryName: 'مخبز النور البلدي',
    village: 'محلة أبو علي',
    date: '2026-11-18',
    category: 'غرامة',
    amountEgp: 4500,
    direction: 'debit',
    paymentMethod: 'قيد مديونية تموينية',
    status: 'معتمد',
    notes: 'غرامة نقص وزن الرغيف طبقاً للمحضر رقم 104',
  },
  {
    id: 'dbt-03',
    receiptNumber: 'مديونية-2026-33',
    bakeryId: 'bak-104',
    bakeryName: 'مخبز الرحمة الحديث',
    village: 'شبرابابل',
    date: '2026-11-12',
    category: 'مديونية',
    amountEgp: 6800,
    direction: 'debit',
    paymentMethod: 'تسوية فروق دقيق',
    status: 'معتمد',
    notes: 'فروق أسعار وتسوية حصص منصرفة خلال الشهر',
  },
  {
    id: 'dbt-04',
    receiptNumber: 'مستحق-2026-19',
    bakeryId: 'bak-103',
    bakeryName: 'مخبز السلام المطور',
    village: 'الجابرية',
    date: '2026-11-19',
    category: 'مستحقات مخبز',
    amountEgp: 5250,
    direction: 'credit',
    paymentMethod: 'تحويل تكلفة تصنيع',
    status: 'قيد المراجعة',
    notes: 'مستحقات تكلفة إنتاج وتصنيع عن الأسبوع الثالث من نوفمبر',
  },
  {
    id: 'dbt-05',
    receiptNumber: 'إيصال-89102',
    bakeryId: 'bak-105',
    bakeryName: 'مخبز البركة البلدي',
    village: 'الهياتم',
    date: '2026-11-15',
    category: 'سداد نقدي / شيك',
    amountEgp: 8400,
    direction: 'credit',
    paymentMethod: 'توريد خزينة الإدارة',
    status: 'مسدد',
    notes: 'سداد تسوية المحضر التمويني رقم 119 بالكامل',
  },
];

const STORAGE_KEYS = {
  USERS: 'gharbia_supply_users_v4',
  BRANCHES: 'gharbia_supply_branches_v4',
  DEPARTMENTS: 'gharbia_supply_departments_v5',
  AUDIT_LOGS: 'gharbia_supply_audit_v4',
  REG_REQUESTS: 'gharbia_supply_reqs_v4',
  CURRENT_USER: 'gharbia_supply_current_user_v4',
  SELECTED_BRANCH: 'gharbia_supply_selected_branch_v4',
  BAKERIES: 'gharbia_supply_bakeries_mahalla_v4',
  BAKERY_AUDIT: 'gharbia_supply_bakery_audit_v4',
  BAKERY_COLUMNS: 'gharbia_supply_bakery_columns_49_v6',
  BAKERY_COLUMN_GROUPS: 'gharbia_supply_bakery_col_groups_v6',
  BAKERY_LAST_RECALC: 'gharbia_supply_bakery_last_recalc_v4',
  BAKERY_ALERT_ACTIONS: 'gharbia_supply_bakery_alert_actions_v4',
  BAKERY_INSPECTIONS: 'gharbia_supply_bakery_inspections_v1',
  BAKERY_DEBTS: 'gharbia_supply_bakery_debts_v1',
  TABLE_PIN_PREFS: 'gharbia_supply_table_pins_v1',
  TABLE_WIDTH_PREFS: 'gharbia_supply_table_widths_v1',
};

export function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: User[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function getStoredBranches(): Branch[] {
  if (typeof window === 'undefined') return INITIAL_BRANCHES;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    return data ? JSON.parse(data) : INITIAL_BRANCHES;
  } catch {
    return INITIAL_BRANCHES;
  }
}

export function saveStoredBranches(branches: Branch[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
}

export function getStoredDepartments(): Department[] {
  if (typeof window === 'undefined') return INITIAL_DEPARTMENTS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
    if (!data) return INITIAL_DEPARTMENTS;
    const parsed: Department[] = JSON.parse(data).map((d: Department) =>
      d.id === 'd-04'
        ? {
            ...d,
            name: 'قسم التجارة الداخلية',
            arabicName: 'قسم التجارة الداخلية',
            description: 'إدارة ومتابعة المنشآت التجارية والأسواق والسلع والأنشطة التموينية والمواد البترولية',
          }
        : d
    );
    const existingIds = new Set(parsed.map((d) => d.id));
    const missing = INITIAL_DEPARTMENTS.filter((d) => !existingIds.has(d.id));
    return missing.length > 0 ? [...parsed, ...missing] : parsed;
  } catch {
    return INITIAL_DEPARTMENTS;
  }
}

export function getStoredAuditLogs(): AuditLog[] {
  if (typeof window === 'undefined') return INITIAL_AUDIT_LOGS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return data ? JSON.parse(data) : INITIAL_AUDIT_LOGS;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return;
  const logs = getStoredAuditLogs();
  const newLog: AuditLog = {
    ...log,
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([newLog, ...logs].slice(0, 500)));
}

export function getStoredRegistrationRequests(): RegistrationRequest[] {
  if (typeof window === 'undefined') return INITIAL_REGISTRATION_REQUESTS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REG_REQUESTS);
    return data ? JSON.parse(data) : INITIAL_REGISTRATION_REQUESTS;
  } catch {
    return INITIAL_REGISTRATION_REQUESTS;
  }
}

export function saveStoredRegistrationRequests(reqs: RegistrationRequest[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.REG_REQUESTS, JSON.stringify(reqs));
}

export function getCurrentSessionUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCurrentSessionUser(user: User | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_BRANCH);
  }
}

export function getSelectedBranchSession(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.SELECTED_BRANCH);
}

export function setSelectedBranchSession(branchId: string | null) {
  if (typeof window === 'undefined') return;
  if (branchId) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_BRANCH, branchId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_BRANCH);
  }
}

export function getStoredBakeries(): BakeryRecord[] {
  if (typeof window === 'undefined') return INITIAL_BAKERIES;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BAKERIES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.BAKERIES, JSON.stringify(INITIAL_BAKERIES));
      return INITIAL_BAKERIES;
    }
    const parsed: BakeryRecord[] = JSON.parse(data);
    return parsed.map(b => computeBakeryEquations(b));
  } catch {
    return INITIAL_BAKERIES;
  }
}

export function saveStoredBakeries(bakeries: BakeryRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BAKERIES, JSON.stringify(bakeries));
}

export function getStoredBakeryAuditChanges(): BakeryAuditChange[] {
  if (typeof window === 'undefined') return INITIAL_BAKERY_AUDIT_CHANGES;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BAKERY_AUDIT);
    return data ? JSON.parse(data) : INITIAL_BAKERY_AUDIT_CHANGES;
  } catch {
    return INITIAL_BAKERY_AUDIT_CHANGES;
  }
}

export function addBakeryAuditChange(change: Omit<BakeryAuditChange, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return;
  const list = getStoredBakeryAuditChanges();
  const newChange: BakeryAuditChange = {
    ...change,
    id: `baud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.BAKERY_AUDIT, JSON.stringify([newChange, ...list].slice(0, 500)));
}

export function getStoredBakeryColumns(userId?: string): BakeryColumnConfig[] {
  if (typeof window === 'undefined') return DEFAULT_BAKERY_COLUMNS;
  try {
    const key = userId ? `${STORAGE_KEYS.BAKERY_COLUMNS}_${userId}` : STORAGE_KEYS.BAKERY_COLUMNS;
    const data = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEYS.BAKERY_COLUMNS);
    if (!data) return DEFAULT_BAKERY_COLUMNS;
    const parsed: BakeryColumnConfig[] = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length < DEFAULT_BAKERY_COLUMNS.length) {
      return DEFAULT_BAKERY_COLUMNS;
    }
    return parsed;
  } catch {
    return DEFAULT_BAKERY_COLUMNS;
  }
}

export function saveStoredBakeryColumns(cols: BakeryColumnConfig[], userId?: string) {
  if (typeof window === 'undefined') return;
  const key = userId ? `${STORAGE_KEYS.BAKERY_COLUMNS}_${userId}` : STORAGE_KEYS.BAKERY_COLUMNS;
  localStorage.setItem(key, JSON.stringify(cols));
  localStorage.setItem(STORAGE_KEYS.BAKERY_COLUMNS, JSON.stringify(cols));
}

export function getUserTablePinnedColumns(tableId: string, userId?: string, defaultPins: string[] = []): string[] {
  if (typeof window === 'undefined') return defaultPins;
  try {
    const key = `${STORAGE_KEYS.TABLE_PIN_PREFS}_${userId || 'default'}_${tableId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultPins;
  } catch {
    return defaultPins;
  }
}

export function saveUserTablePinnedColumns(tableId: string, pinnedKeys: string[], userId?: string) {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_KEYS.TABLE_PIN_PREFS}_${userId || 'default'}_${tableId}`;
  localStorage.setItem(key, JSON.stringify(pinnedKeys));
}

export function getUserTableColumnWidths(tableId: string, userId?: string): Record<string, number> | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${STORAGE_KEYS.TABLE_WIDTH_PREFS}_${userId || 'default'}_${tableId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveUserTableColumnWidths(
  tableId: string,
  widths: Record<string, number>,
  userId?: string
) {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_KEYS.TABLE_WIDTH_PREFS}_${userId || 'default'}_${tableId}`;
  localStorage.setItem(key, JSON.stringify(widths));
}

export function clearUserTableColumnWidths(tableId: string, userId?: string) {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_KEYS.TABLE_WIDTH_PREFS}_${userId || 'default'}_${tableId}`;
  localStorage.removeItem(key);
}

export function getStoredBakeryColumnGroups(): BakeryColumnGroupConfig {
  if (typeof window === 'undefined') return DEFAULT_BAKERY_COLUMN_GROUPS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BAKERY_COLUMN_GROUPS);
    return data ? JSON.parse(data) : DEFAULT_BAKERY_COLUMN_GROUPS;
  } catch {
    return DEFAULT_BAKERY_COLUMN_GROUPS;
  }
}

export function saveStoredBakeryColumnGroups(groups: BakeryColumnGroupConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BAKERY_COLUMN_GROUPS, JSON.stringify(groups));
}

export function getLastBakeryRecalcTimestamp(): string {
  if (typeof window === 'undefined') return DEFAULT_LAST_RECALC_TIMESTAMP;
  return localStorage.getItem(STORAGE_KEYS.BAKERY_LAST_RECALC) || DEFAULT_LAST_RECALC_TIMESTAMP;
}

export function setLastBakeryRecalcTimestamp(iso: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BAKERY_LAST_RECALC, iso);
}

export function getStoredAlertActions(): AlertActionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BAKERY_ALERT_ACTIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStoredAlertActions(acts: AlertActionRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BAKERY_ALERT_ACTIONS, JSON.stringify(acts));
}

export function getStoredInspections(): InspectionRecord[] {
  if (typeof window === 'undefined') return INITIAL_INSPECTIONS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BAKERY_INSPECTIONS);
    return data ? JSON.parse(data) : INITIAL_INSPECTIONS;
  } catch {
    return INITIAL_INSPECTIONS;
  }
}

export function saveStoredInspections(records: InspectionRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BAKERY_INSPECTIONS, JSON.stringify(records));
}

export function getStoredDebtTransactions(): DebtTransactionRecord[] {
  if (typeof window === 'undefined') return INITIAL_DEBT_TRANSACTIONS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BAKERY_DEBTS);
    return data ? JSON.parse(data) : INITIAL_DEBT_TRANSACTIONS;
  } catch {
    return INITIAL_DEBT_TRANSACTIONS;
  }
}

export function saveStoredDebtTransactions(records: DebtTransactionRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BAKERY_DEBTS, JSON.stringify(records));
}


