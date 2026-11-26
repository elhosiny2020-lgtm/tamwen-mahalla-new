export type AppLanguage = 'ar' | 'en';

export interface TranslationDictionary {
  // Brand & Header
  ministryTitle: string;
  directorateTitle: string;
  defaultBranch: string;
  dbConnected: string;
  autoSaveEnabled: string;
  switchBranch: string;
  notificationsCenter: string;
  logout: string;
  todayLabel: string;

  // Global Control Bar
  fontSizeBtn: string;
  fontSizeTitle: string;
  fontIncrease: string;
  fontDecrease: string;
  fontReset: string;
  fontPreview: string;
  languageBtn: string;
  languageTitle: string;
  arabicLabel: string;
  englishLabel: string;
  languageNote: string;
  themeBtn: string;
  themeTitle: string;
  customColorsTitle: string;
  customBgLabel: string;
  customPrimaryLabel: string;
  customAccentLabel: string;
  applyCustomTheme: string;
  resetThemeBtn: string;
  displayBtn: string;
  displayTitle: string;
  autoDisplayMode: string;
  manualDisplayMode: string;
  densityLabel: string;
  densityCompact: string;
  densityComfortable: string;
  densitySpacious: string;
  screenDiagnostics: string;
  viewportSize: string;
  pixelRatio: string;
  detectedProfile: string;
  savedForUser: string;

  // Theme Names
  theme_gov_navy: string;
  theme_soft_white: string;
  theme_calm_gray: string;
  theme_calm_blue: string;
  theme_calm_green: string;
  theme_warm_beige: string;
  theme_dark_mode: string;
  theme_eye_comfort: string;
  theme_custom: string;

  // Sidebar & Navigation
  departments: string;
  searchDepartments: string;
  expandSidebar: string;
  collapseSidebar: string;
  pinSidebar: string;
  unpinSidebar: string;
  openSection: string;
  authorizedSections: string;
  grp_cmd: string;
  grp_bakery: string;
  grp_trade: string;
  grp_ration: string;
  grp_citizens: string;
  grp_admin: string;

  // Dashboard
  republicSubtitle: string;
  centralDashboardTitle: string;
  centralDashboardDesc: string;
  openBakerySystem: string;
  mainDepartmentsTitle: string;
  mainDepartmentsDesc: string;
  activeWithData: string;
  registeredBakeries: string;

  // Common CRUD & Table Actions
  view: string;
  add: string;
  edit: string;
  delete: string;
  reverseEntry: string;
  save: string;
  cancel: string;
  close: string;
  search: string;
  active: string;
  disabled: string;
  enable: string;
  disable: string;
  actions: string;
  exportExcel: string;
  recordsCount: string;
  unpinAll: string;
  manualPin: string;

  // Villages & Dropdown Lists Module
  dropdownModuleTitle: string;
  dropdownModuleSubtitle: string;
  tabVillagesHierarchy: string;
  tabSmartDropdowns: string;
  tabDocExpiries: string;
  tabTableHeaders: string;
  addNewVillage: string;
  addLocalUnit: string;
  villageNameLabel: string;
  localUnitNameLabel: string;
  supplyAdminLabel: string;
  localUnitsCount: string;
  noLocalUnitsYet: string;
  clickToExpandUnits: string;
  addNewItem: string;
  addNewListGroup: string;
  selectListPrompt: string;
  parentItemOptional: string;
  noParentRoot: string;
  duplicateBlockedMsg: string;
  inUseDeleteBlocked: string;
  dragOrReorderHint: string;

  // Factory Reset
  factoryResetBtn: string;
  factoryResetTitle: string;
  factoryResetAdminOnly: string;
  factoryResetScopeWarn: string;
  factoryResetTableSummary: string;
  factoryResetTableCol: string;
  factoryResetCountCol: string;
  factoryResetIncludeCustomLists: string;
  factoryResetBackupStep: string;
  factoryResetCreateBackupBtn: string;
  factoryResetDownloadBackupBtn: string;
  factoryResetBackupSuccess: string;
  factoryResetBackupRequired: string;
  factoryResetPhraseLabel: string;
  factoryResetPhraseExpected: string;
  factoryResetPasswordLabel: string;
  factoryResetPasswordPlaceholder: string;
  factoryResetExecuteBtn: string;
  factoryResetSuccessTitle: string;
  factoryResetSuccessDesc: string;
  factoryResetRestoreBackupBtn: string;

  // Footer
  footerRepublic: string;
  footerDirectorate: string;
  footerSecured: string;
  loadingSystem: string;
}

const AR: TranslationDictionary = {
  ministryTitle: 'وزارة التموين والتجارة الداخلية — محافظة الغربية',
  directorateTitle: 'مديرية التموين بالغربية',
  defaultBranch: 'إدارة تموين مركز المحلة الكبرى',
  dbConnected: 'قاعدة البيانات متصلة',
  autoSaveEnabled: 'الحفظ التلقائي مفعل',
  switchBranch: 'تبديل الإدارة التموينية',
  notificationsCenter: 'مركز الإشعارات والتنبيهات',
  logout: 'خروج',
  todayLabel: 'اليوم',

  fontSizeBtn: 'حجم الخط',
  fontSizeTitle: 'التحكم في حجم الخطوط بالمنظومة',
  fontIncrease: 'تكبير الخط (+)',
  fontDecrease: 'تصغير الخط (-)',
  fontReset: 'الحجم الافتراضي (١٠٠٪)',
  fontPreview: 'معاينة: أرقام ١٢٣٤٥٦ — جدول البيانات والأزرار',
  languageBtn: 'اللغة / Language',
  languageTitle: 'لغة الواجهة واتجاه العرض',
  arabicLabel: 'العربية 🇪🇬 (يمين إلى يسار RTL)',
  englishLabel: 'English 🇬🇧 (Left-to-Right LTR)',
  languageNote: 'تُترجم عناوين الواجهة والقوائم والأزرار فقط مع الحفاظ على البيانات المدخلة والأسماء الأصلية كما هي.',
  themeBtn: 'الألوان والمظهر',
  themeTitle: 'أنماط الألوان وراحة العين',
  customColorsTitle: 'تخصيص الألوان يدوياً',
  customBgLabel: 'خلفية الواجهة',
  customPrimaryLabel: 'اللون الرئيسي',
  customAccentLabel: 'اللون المميز',
  applyCustomTheme: 'تطبيق اللون المخصص',
  resetThemeBtn: 'العودة للكحلي الحكومي',
  displayBtn: 'إعدادات العرض',
  displayTitle: 'الضبط الذكي لدقة الشاشة والعرض',
  autoDisplayMode: 'ضبط تلقائي للشاشة',
  manualDisplayMode: 'ضبط يدوي للعناصر',
  densityLabel: 'كثافة العرض والمسافات',
  densityCompact: 'مكثف (للجداول الواسعة)',
  densityComfortable: 'متوازن (افتراضي)',
  densitySpacious: 'مريح وواسع',
  screenDiagnostics: 'قياسات مساحة العرض الفعلية',
  viewportSize: 'أبعاد المتصفح',
  pixelRatio: 'كثافة البكسلات / التكبير',
  detectedProfile: 'ملف الشاشة المكتشف',
  savedForUser: 'محفوظ تلقائياً لحسابك الشخصي فقط',

  theme_gov_navy: 'الكحلي والأبيض الحكومي',
  theme_soft_white: 'الأبيض المريح',
  theme_calm_gray: 'الرمادي الهادئ',
  theme_calm_blue: 'الأزرق الهادئ',
  theme_calm_green: 'الأخضر الهادئ',
  theme_warm_beige: 'البيج الدافئ',
  theme_dark_mode: 'الوضع الداكن Dark Mode',
  theme_eye_comfort: 'وضع راحة العين Eye Comfort',
  theme_custom: 'لون مخصص',

  departments: 'الأقسام',
  searchDepartments: 'بحث في الأقسام...',
  expandSidebar: 'توسيع القائمة الجانبية',
  collapseSidebar: 'طي القائمة الجانبية',
  pinSidebar: 'تثبيت القائمة',
  unpinSidebar: 'إلغاء تثبيت القائمة',
  openSection: 'فتح القسم',
  authorizedSections: 'قسماً مصرحاً',
  grp_cmd: 'القيادة والعمليات اليومية',
  grp_bakery: 'منظومة المخابز والمديونيات',
  grp_trade: 'التجارة الداخلية والوقود',
  grp_ration: 'السلع التموينية والغذاء',
  grp_citizens: 'الرقابة والتفتيش والمواطنين',
  grp_admin: 'الإدارة المركزية والقوائم والحوكمة',

  republicSubtitle: 'جمهورية مصر العربية · وزارة التموين والتجارة الداخلية · محافظة الغربية',
  centralDashboardTitle: 'لوحة القيادة المركزية الموحدة',
  centralDashboardDesc: 'منصة حكومية رقمية متكاملة لإدارة البيانات والخدمات التموينية، وتعزيز كفاءة المتابعة والرقابة، ودعم اتخاذ القرار.',
  openBakerySystem: 'فتح منظومة الرقابة على المخابز',
  mainDepartmentsTitle: 'الأقسام الرئيسية لمنظومة الإدارة الرقمية المتكاملة',
  mainDepartmentsDesc: 'اضغط على أي قسم للانتقال المباشر إلى سجلاته وإحصائياته الحية',
  activeWithData: 'قسم مفعل بالبيانات',
  registeredBakeries: 'مخبز مسجل',

  view: 'عرض',
  add: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  reverseEntry: 'قيد عكسي',
  save: 'حفظ',
  cancel: 'إلغاء',
  close: 'إغلاق',
  search: 'بحث...',
  active: 'مفعّل',
  disabled: 'معطّل',
  enable: 'تفعيل',
  disable: 'تعطيل',
  actions: 'الإجراءات',
  exportExcel: 'تصدير Excel',
  recordsCount: 'سجل',
  unpinAll: 'إلغاء التثبيت',
  manualPin: 'إكمال التثبيت يدوياً',

  dropdownModuleTitle: 'إدارة القرى والوحدات المحلية والقوائم المنسدلة الذكية',
  dropdownModuleSubtitle: 'إدارة متدرجة للقرى والوحدات المحلية، قوائم منسدلة مصنّفة وقابلة للتوسع، وترابط تلقائي فوري مع جميع النماذج والتقارير',
  tabVillagesHierarchy: '١. القرى والوحدات المحلية (التدرج الذكي)',
  tabSmartDropdowns: '٢. إدارة القوائم المنسدلة (مجموعات منظمة)',
  tabDocExpiries: '٣. التراخيص والبطاقات والسجلات (الكالندر)',
  tabTableHeaders: '٤. تخصيص رؤوس أعمدة الجداول',
  addNewVillage: 'إضافة قرية جديدة',
  addLocalUnit: 'إضافة وحدة محلية',
  villageNameLabel: 'اسم القرية / الشياخة',
  localUnitNameLabel: 'اسم الوحدة المحلية',
  supplyAdminLabel: 'الإدارة التموينية',
  localUnitsCount: 'وحدة محلية',
  noLocalUnitsYet: 'لا توجد وحدات محلية مضافة لهذه القرية بعد — اضغط «+ إضافة وحدة محلية» أدناه.',
  clickToExpandUnits: 'اضغط لفتح أو إغلاق الوحدات المحلية التابعة',
  addNewItem: 'إضافة عنصر جديد',
  addNewListGroup: 'إضافة قائمة جديدة',
  selectListPrompt: 'اختر القائمة المنسدلة المطلوب إدارتها',
  parentItemOptional: 'العنصر الرئيسي التابع له (اختياري)',
  noParentRoot: 'عنصر رئيسي مستقل',
  duplicateBlockedMsg: 'تنبيه: هذا الاسم مسجل بالفعل داخل نفس القائمة — يُمنع التكرار حفاظاً على دقة البيانات.',
  inUseDeleteBlocked: 'لا يمكن الحذف لأن هذا العنصر مرتبط بسجلات فعلية في المنظومة. يمكنك استخدام زر «تعطيل» لإخفائه من الإضافات الجديدة مع الحفاظ على السجلات القديمة.',
  dragOrReorderHint: 'يمكنك سحب العناصر لترتيبها أو استخدام أزرار التقديم والتأخير (▲ / ▼).',

  factoryResetBtn: 'إعادة ضبط المصنع',
  factoryResetTitle: 'إعادة ضبط المصنع للقسم',
  factoryResetAdminOnly: 'متاح لمدير النظام وأصحاب الصلاحية الإدارية العليا فقط',
  factoryResetScopeWarn: 'تحذير أمني: ستؤدي هذه العملية إلى مسح جميع بيانات هذا القسم المحدد فقط. لن تتأثر الأقسام الأخرى أو حسابات المستخدمين أو صلاحياتهم أو إعدادات قاعدة البيانات أو الشعارات العامة.',
  factoryResetTableSummary: 'ملخص الجداول وعدد السجلات التي سيتم مسحها في هذا القسم:',
  factoryResetTableCol: 'اسم الجدول / السجل',
  factoryResetCountCol: 'عدد السجلات',
  factoryResetIncludeCustomLists: 'مسح القوائم المخصصة والإعدادات التي أُنشئت داخل هذا القسم أيضاً',
  factoryResetBackupStep: 'الخطوة ١: إنشاء نسخة احتياطية قابلة للاسترجاع قبل التنفيذ (إلزامي)',
  factoryResetCreateBackupBtn: 'إنشاء نسخة احتياطية آمنة الآن',
  factoryResetDownloadBackupBtn: 'تنزيل ملف النسخة الاحتياطية (JSON)',
  factoryResetBackupSuccess: 'تم حفظ النسخة الاحتياطية بنجاح والتحقق من سلامتها.',
  factoryResetBackupRequired: 'يجب إنشاء نسخة احتياطية ناجحة أولاً قبل تفعيل زر التنفيذ.',
  factoryResetPhraseLabel: 'الخطوة ٢: اكتب عبارة التأكيد التالية بالضبط:',
  factoryResetPhraseExpected: 'تأكيد إعادة ضبط المصنع',
  factoryResetPasswordLabel: 'الخطوة ٣: التحقق الإداري (أعد إدخال كلمة المرور أو رمز التحقق الإداري):',
  factoryResetPasswordPlaceholder: 'أدخل كلمة المرور أو اسم المستخدم الإداري للتحقق...',
  factoryResetExecuteBtn: 'تنفيذ إعادة ضبط المصنع الآن',
  factoryResetSuccessTitle: 'تمت إعادة ضبط المصنع بنجاح',
  factoryResetSuccessDesc: 'أصبح القسم فارغاً وجاهزاً للبدء من جديد، وتم تسجيل العملية في سجل التدقيق الأمني مع الاحتفاظ بنسخة احتياطية قابلة للاسترجاع.',
  factoryResetRestoreBackupBtn: 'استرجاع النسخة الاحتياطية فوراً',

  footerRepublic: 'جمهورية مصر العربية · محافظة الغربية',
  footerDirectorate: 'مديرية التموين والتجارة الداخلية — منظومة الإدارة والرقابة التموينية الموحدة',
  footerSecured: 'النظام مؤمن ومشفر بالكامل',
  loadingSystem: 'جاري تحميل المنظومة التموينية الموحدة...',
};

const EN: TranslationDictionary = {
  ministryTitle: 'Ministry of Supply & Internal Trade — Gharbia Governorate',
  directorateTitle: 'Gharbia Supply Directorate',
  defaultBranch: 'El-Mahalla El-Kubra Supply Administration',
  dbConnected: 'Database Connected',
  autoSaveEnabled: 'Auto-Save Enabled',
  switchBranch: 'Switch Administration',
  notificationsCenter: 'Alerts & Notifications Center',
  logout: 'Sign Out',
  todayLabel: 'Today',

  fontSizeBtn: 'Font Size',
  fontSizeTitle: 'Global System Font Scale',
  fontIncrease: 'Increase (+)',
  fontDecrease: 'Decrease (-)',
  fontReset: 'Reset Default (100%)',
  fontPreview: 'Preview: Numbers 123456 — Data Tables & Controls',
  languageBtn: 'Language / اللغة',
  languageTitle: 'Interface Language & Direction',
  arabicLabel: 'العربية 🇪🇬 (Right-to-Left RTL)',
  englishLabel: 'English 🇬🇧 (Left-to-Right LTR)',
  languageNote: 'Translates interface labels, menus, and buttons while preserving all user-entered names and records untouched.',
  themeBtn: 'Colors & Theme',
  themeTitle: 'Color Palettes & Eye Comfort',
  customColorsTitle: 'Custom Color Palette',
  customBgLabel: 'Canvas Background',
  customPrimaryLabel: 'Primary Color',
  customAccentLabel: 'Accent Color',
  applyCustomTheme: 'Apply Custom Colors',
  resetThemeBtn: 'Reset to Official Navy',
  displayBtn: 'Display Settings',
  displayTitle: 'Smart Screen Resolution & Scaling',
  autoDisplayMode: 'Auto Screen Fit',
  manualDisplayMode: 'Manual Layout Control',
  densityLabel: 'UI Spacing & Density',
  densityCompact: 'Compact (Wide Data Grids)',
  densityComfortable: 'Balanced (Default)',
  densitySpacious: 'Spacious & Relaxed',
  screenDiagnostics: 'Live Browser Viewport Metrics',
  viewportSize: 'Viewport Dimensions',
  pixelRatio: 'Device Pixel Ratio / Scale',
  detectedProfile: 'Detected Display Profile',
  savedForUser: 'Saved independently for your account',

  theme_gov_navy: 'Official Navy & White',
  theme_soft_white: 'Comfort White',
  theme_calm_gray: 'Calm Gray',
  theme_calm_blue: 'Calm Blue',
  theme_calm_green: 'Calm Green',
  theme_warm_beige: 'Warm Beige',
  theme_dark_mode: 'Dark Mode',
  theme_eye_comfort: 'Eye Comfort Mode',
  theme_custom: 'Custom Theme',

  departments: 'Departments',
  searchDepartments: 'Search departments...',
  expandSidebar: 'Expand sidebar',
  collapseSidebar: 'Collapse sidebar',
  pinSidebar: 'Pin sidebar',
  unpinSidebar: 'Unpin sidebar',
  openSection: 'Open Section',
  authorizedSections: 'authorized sections',
  grp_cmd: 'Command & Daily Operations',
  grp_bakery: 'Bakeries & Debts System',
  grp_trade: 'Internal Trade & Fuel',
  grp_ration: 'Ration Commodities & Food',
  grp_citizens: 'Inspection, Control & Citizens',
  grp_admin: 'Central Governance & Lists',

  republicSubtitle: 'Arab Republic of Egypt · Ministry of Supply & Internal Trade · Gharbia',
  centralDashboardTitle: 'Unified Central Command Dashboard',
  centralDashboardDesc: 'Integrated digital government platform for supply data management, field oversight, financial follow-up, and decision support.',
  openBakerySystem: 'Open Bakery Oversight System',
  mainDepartmentsTitle: 'Core Departments of the Unified Supply Platform',
  mainDepartmentsDesc: 'Select any department to open its live registries, workflows, and analytics',
  activeWithData: 'Active module',
  registeredBakeries: 'registered bakeries',

  view: 'View',
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  reverseEntry: 'Reverse Entry',
  save: 'Save',
  cancel: 'Cancel',
  close: 'Close',
  search: 'Search...',
  active: 'Active',
  disabled: 'Disabled',
  enable: 'Enable',
  disable: 'Disable',
  actions: 'Actions',
  exportExcel: 'Export Excel',
  recordsCount: 'records',
  unpinAll: 'Unpin All',
  manualPin: 'Pin Manually',

  dropdownModuleTitle: 'Villages, Local Units & Smart Dropdown Lists Manager',
  dropdownModuleSubtitle: 'Hierarchical village & local unit management, categorized extensible dropdown lists, and live cascading sync across all forms & reports',
  tabVillagesHierarchy: '1. Villages & Local Units (Hierarchy)',
  tabSmartDropdowns: '2. Smart Dropdown Lists (Groups)',
  tabDocExpiries: '3. Licenses, Tax & CR (Calendar)',
  tabTableHeaders: '4. Table Column Headers',
  addNewVillage: 'Add New Village',
  addLocalUnit: 'Add Local Unit',
  villageNameLabel: 'Village Name',
  localUnitNameLabel: 'Local Unit Name',
  supplyAdminLabel: 'Supply Administration',
  localUnitsCount: 'local units',
  noLocalUnitsYet: 'No local units added under this village yet — click "+ Add Local Unit" below.',
  clickToExpandUnits: 'Click to expand or collapse subordinate local units',
  addNewItem: 'Add New Item',
  addNewListGroup: 'Add New List',
  selectListPrompt: 'Select a dropdown list to manage',
  parentItemOptional: 'Parent Item (Optional)',
  noParentRoot: 'Independent Top-Level Item',
  duplicateBlockedMsg: 'Duplicate blocked: this name already exists in the selected list.',
  inUseDeleteBlocked: 'Deletion blocked because this item is linked to active system records. Use "Disable" to hide it from new entries while preserving historical records.',
  dragOrReorderHint: 'Drag and drop items to reorder or use the Up/Down (▲ / ▼) buttons.',

  factoryResetBtn: 'Factory Reset',
  factoryResetTitle: 'Section Factory Reset',
  factoryResetAdminOnly: 'Restricted to System Administrators and Authorized Managers',
  factoryResetScopeWarn: 'Security Notice: This action clears ONLY the records inside this specific section. Other sections, user accounts, permissions, database connections, and shared assets remain completely untouched.',
  factoryResetTableSummary: 'Summary of tables and record counts to be cleared in this section:',
  factoryResetTableCol: 'Table / Registry',
  factoryResetCountCol: 'Records',
  factoryResetIncludeCustomLists: 'Also clear custom lists and section-level custom settings',
  factoryResetBackupStep: 'Step 1: Create a verifiable restorable backup before reset (Mandatory)',
  factoryResetCreateBackupBtn: 'Create Verified Backup Now',
  factoryResetDownloadBackupBtn: 'Download Backup File (JSON)',
  factoryResetBackupSuccess: 'Backup created, stored, and verified successfully.',
  factoryResetBackupRequired: 'A verified backup is required before executing factory reset.',
  factoryResetPhraseLabel: 'Step 2: Type the exact confirmation phrase below:',
  factoryResetPhraseExpected: 'CONFIRM FACTORY RESET',
  factoryResetPasswordLabel: 'Step 3: Administrative Verification (Re-enter your password or admin username):',
  factoryResetPasswordPlaceholder: 'Enter admin password or verification credential...',
  factoryResetExecuteBtn: 'Execute Factory Reset Now',
  factoryResetSuccessTitle: 'Factory Reset Completed Safely',
  factoryResetSuccessDesc: 'This section is now empty and ready for fresh data entry. The operation has been logged in the security audit trail and a restorable backup is saved.',
  factoryResetRestoreBackupBtn: 'Restore From Backup',

  footerRepublic: 'Arab Republic of Egypt · Gharbia Governorate',
  footerDirectorate: 'Gharbia Directorate of Supply & Internal Trade — Unified Digital Oversight Platform',
  footerSecured: 'System Fully Secured & Audited',
  loadingSystem: 'Loading Unified Supply Management Platform...',
};

export const DICTIONARIES: Record<AppLanguage, TranslationDictionary> = {
  ar: AR,
  en: EN,
};

export const DEPARTMENT_ENGLISH_NAMES: Record<string, { name: string; description: string }> = {
  DASH: { name: 'Unified Central Dashboard', description: 'Strategic KPIs and central operations room' },
  BAK: { name: 'Bakery Oversight System', description: 'Subsidized bakeries, 7 formulas, licenses, contracts & alerts' },
  DEBTS: { name: 'Bakery Owners Debts', description: 'Financial collections, installments, schedules & violations' },
  TRADE: { name: 'Internal Trade Department', description: 'Commercial establishments, markets, commodities & petroleum' },
  CTRL: { name: 'Unified Control Center', description: 'Operations room and urgent field reports' },
  GAS: { name: 'Butane & Petroleum Distribution', description: 'Butane depots, fuel stations & distributors' },
  COMM: { name: 'Ration Commodities Department', description: 'Commodities, merchants, quotas, warehouses, cards & 50 reports' },
  GRAIN: { name: 'Grain Maintenance', description: 'Local and imported wheat oversight' },
  SILOS: { name: 'Silos & Storage Barns', description: 'Storage capacities and wheat supply tracking' },
  MILLS: { name: 'Supply Flour Mills', description: '87.5% extraction subsidized flour milling oversight' },
  COLD: { name: 'Cold Storage Facilities', description: 'Frozen and chilled food commodities inspection' },
  HR: { name: 'Human Resources', description: 'Employee files, assignments, and leaves' },
  FIN: { name: 'Financial & Admin Affairs', description: 'Budgets, accounts, and government procurement' },
  STORE: { name: 'Warehouses & Procurement', description: 'Operational inventory and official custody' },
  INSP: { name: 'Field Inspection & Campaigns', description: 'Planning and executing field inspection campaigns' },
  VIOL: { name: 'Violations & Legal Reports', description: 'Tracking supply violation cases and prosecution referrals' },
  COMP: { name: 'Citizen Complaints & Services', description: 'Receiving and resolving citizen complaints' },
  REP: { name: 'Central Reports & Analytics', description: 'Periodic and analytical directorate reports' },
  DOCS: { name: 'Documents & Digital Archive', description: 'Ministerial decrees and circular books archive' },
  SETT: { name: 'General System Settings', description: 'Platform settings and institutional configuration' },
  USERS: { name: 'Users & Accounts Management', description: 'Creating and managing employee accounts' },
  ROLES: { name: 'Roles, Permissions & Branches', description: 'Configuring user roles across administrations and departments' },
  AUDIT: { name: 'Security & Audit Trail', description: 'Monitoring all system actions and modifications' },
  BACK: { name: 'Backup & Database Recovery', description: 'Managing backups and data protection' },
  TASKS: { name: 'Daily Tasks & Internal Chat', description: 'Daily task assignments and secure inter-staff messaging' },
  LISTS: { name: 'Dropdown Lists & Villages Manager', description: 'Villages, local units, smart dropdowns, calendar expiries & column headers' },
};

export function translate(lang: AppLanguage, key: keyof TranslationDictionary): string {
  return DICTIONARIES[lang]?.[key] ?? AR[key];
}

export function getLocalizedDepartmentName(
  code: string,
  arabicName: string,
  lang: AppLanguage
): string {
  if (lang === 'en' && DEPARTMENT_ENGLISH_NAMES[code]) {
    return DEPARTMENT_ENGLISH_NAMES[code].name;
  }
  return arabicName;
}

export function getLocalizedDepartmentDesc(
  code: string,
  arabicDesc: string,
  lang: AppLanguage
): string {
  if (lang === 'en' && DEPARTMENT_ENGLISH_NAMES[code]) {
    return DEPARTMENT_ENGLISH_NAMES[code].description;
  }
  return arabicDesc;
}

/** قاموس مركزي لترجمة رؤوس الأعمدة الشائعة دون المساس ببيانات الصفوف المدخلة */
export const COMMON_COLUMN_HEADER_EN: Record<string, string> = {
  'م': '#',
  'الإجراءات': 'Actions',
  'إجراءات': 'Actions',
  'الحالة': 'Status',
  'ملاحظات': 'Notes',
  'القرية': 'Village',
  'القرية / الشياخة': 'Village',
  'الوحدة المحلية': 'Local Unit',
  'الإدارة التموينية': 'Supply Admin',
  'رقم ماكينة POS': 'POS Machine #',
  'رقم POS': 'POS #',
  'اسم المخبز': 'Bakery Name',
  'اسم صاحب المخبز': 'Bakery Owner',
  'اسم التاجر': 'Merchant Name',
  'اسم المنشأة': 'Establishment Name',
  'رقم الملف': 'File #',
  'الكود': 'Code',
  'رقم الترخيص': 'License #',
  'تاريخ انتهاء الترخيص': 'License Expiry',
  'انتهاء الترخيص': 'License Expiry',
  'البطاقة الضريبية': 'Tax Card #',
  'رقم البطاقة الضريبية': 'Tax Card #',
  'انتهاء البطاقة الضريبية': 'Tax Card Expiry',
  'تاريخ انتهاء الضريبية': 'Tax Card Expiry',
  'السجل التجاري': 'Commercial Reg #',
  'رقم السجل التجاري': 'Commercial Reg #',
  'انتهاء السجل التجاري': 'CR Expiry',
  'تاريخ انتهاء السجل': 'CR Expiry',
  'الهاتف': 'Phone',
  'رقم الهاتف': 'Phone',
  'الإجمالي': 'Total',
  'المسدد': 'Paid',
  'المتبقي': 'Remaining',
  'التاريخ': 'Date',
  'تاريخ الاستحقاق': 'Due Date',
  'اسم السلعة': 'Commodity',
  'الكمية': 'Quantity',
  'الوحدة': 'Unit',
  'السعر الرسمي': 'Official Price',
  'المخزن': 'Warehouse',
  'الحصة المعتمدة': 'Approved Quota',
  'المنصرف': 'Dispensed',
  'المورد': 'Supplied',
  'رقم البطاقة': 'Card #',
  'عدد المستفيدين': 'Beneficiaries',
};

export function translateColumnHeader(label: string, lang: AppLanguage): string {
  if (lang !== 'en') return label;
  const trimmed = label.trim();
  return COMMON_COLUMN_HEADER_EN[trimmed] ?? label;
}

