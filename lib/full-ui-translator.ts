'use client';

/**
 * محرك الترجمة الكاملة للواجهة (العربية ⇄ الإنجليزية)
 * يترجم كافة عناصر الواجهة الثابتة (التبويبات، الأزرار، رؤوس الجداول، البطاقات، الحالات،
 * الفلاتر، النوافذ المنبثقة، التواريخ، والوحدات) فورياً مع الحفاظ على البيانات المدخلة من المستخدمين
 * واستعادة النص العربي الأصلي حرفياً عند الرجوع إلى العربية.
 */

const ARABIC_DIGIT_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '٫': '.',
  '٬': ',',
  '٪': '%',
  '،': ',',
  '؛': ';',
};

export function toWesternDigits(input: string): string {
  return input.replace(/[٠-٩٫٬٪،؛]/g, (ch) => ARABIC_DIGIT_MAP[ch] ?? ch);
}

/**
 * قاموس شامل للعبارات التموينية والحكومية والمحاسبية والرقابية
 * يُرتب تلقائياً من الأطول إلى الأقصر لمنع الاستبدال الجزئي غير الدقيق.
 */
const AR_TO_EN_PHRASES: Record<string, string> = {
  // ===== الهوية الرسمية والقيادة =====
  'جمهورية مصر العربية': 'Arab Republic of Egypt',
  'وزارة التموين والتجارة الداخلية — محافظة الغربية': 'Ministry of Supply & Internal Trade — Gharbia Governorate',
  'وزارة التموين والتجارة الداخلية': 'Ministry of Supply & Internal Trade',
  'مديرية التموين والتجارة الداخلية بالغربية': 'Gharbia Directorate of Supply & Internal Trade',
  'مديرية التموين بالغربية': 'Gharbia Supply Directorate',
  'إدارة تموين مركز المحلة الكبرى': 'El-Mahalla El-Kubra Supply Administration',
  'محافظة الغربية': 'Gharbia Governorate',
  'منظومة الإدارة والرقابة التموينية الموحدة': 'Unified Supply Management & Oversight Platform',
  'لوحة القيادة المركزية الموحدة': 'Unified Central Command Dashboard',
  'القائمة الرئيسية للأقسام': 'Main Departments Menu',
  'القائمة الجانبية': 'Sidebar Menu',
  'تسجيل الدخول': 'Sign In',
  'تسجيل الخروج': 'Sign Out',
  'تصميم وتطوير المهندس أحمد الحسيني': 'Designed & Developed by Eng. Ahmed El-Hosseiny',

  // ===== الأقسام الرئيسية والمجموعات =====
  'القيادة والعمليات اليومية': 'Command & Daily Operations',
  'منظومة المخابز والمديونيات': 'Bakeries & Debts System',
  'التجارة الداخلية والوقود': 'Internal Trade & Fuel',
  'قسم السلع التموينية': 'Ration Commodities Dept.',
  'السلع التموينية والغذاء': 'Ration Commodities & Food',
  'صيانة الحبوب': 'Grain Maintenance',
  'صيانة الحبوب والأقماح': 'Grain & Wheat Maintenance',
  'الشون والصوامع الهندسية': 'Engineering Barns & Silos',
  'الشون والصوامع': 'Barns & Silos',
  'المطاحن التموينية': 'Supply Flour Mills',
  'الثلاجات وحفظ الأغذية': 'Cold Storage & Food Preservation',
  'الرقابة والتفتيش والمواطنين': 'Inspection, Control & Citizens',
  'الإدارة المركزية والقوائم والحوكمة': 'Central Governance & Lists',
  'منظومة إدارة المخابز البلدية': 'Municipal Bakeries Management System',
  'منظومة الرقابة على المخابز': 'Bakery Oversight System',
  'منظومة إدارة مديونيات أصحاب المخابز': 'Bakery Owners Debts Management System',
  'منظومة مديونيات أصحاب المخابز': 'Bakery Owners Debts System',
  'قسم التجارة الداخلية': 'Internal Trade Department',
  'إدارة ومتابعة المنشآت التجارية والأسواق والسلع والأنشطة التموينية والمواد البترولية':
    'Management & oversight of commercial establishments, markets, commodities & petroleum activities',
  'مركز السيطرة والرقابة الموحد': 'Unified Control & Oversight Center',
  'البوتاجاز والمواد البترولية': 'Butane & Petroleum Materials',
  'التفتيش والحملات الرقابية': 'Inspection & Field Campaigns',
  'المخالفات والمحاضر القانونية': 'Violations & Legal Reports',
  'شكاوى وخدمات المواطنين': 'Citizen Complaints & Services',
  'المهام اليومية والمحادثات الداخلية': 'Daily Tasks & Internal Chat',
  'إدارة القوائم المنسدلة والقرى': 'Dropdown Lists & Villages Manager',
  'إدارة القرى والوحدات المحلية والقوائم المنسدلة الذكية':
    'Villages, Local Units & Smart Dropdown Lists Manager',
  'إدارة القرى والوحدات المحلية': 'Villages & Local Units Management',
  'إدارة القوائم المنسدلة': 'Dropdown Lists Management',
  'الموارد البشرية وشؤون العاملين': 'Human Resources & Staff Affairs',
  'الشؤون المالية والإدارية': 'Financial & Administrative Affairs',
  'المخازن والمشتريات': 'Warehouses & Procurement',
  'التقارير المركزية والتحليلات': 'Central Reports & Analytics',
  'الأرشيف الرقمي والقرارات الوزارية': 'Digital Archive & Ministerial Decrees',
  'النسخ الاحتياطي واستعادة البيانات': 'Backup & Data Recovery',
  'الإعدادات العامة للنظام': 'General System Settings',
  'إدارة المستخدمين والحسابات': 'Users & Accounts Management',
  'الأدوار والصلاحيات والفروع': 'Roles, Permissions & Branches',
  'سجل الأمان والتدقيق': 'Security & Audit Trail',
  'المخابز البلدية': 'Municipal Bakeries',
  'التجارة الداخلية': 'Internal Trade',
  'السلع التموينية': 'Ration Commodities',
  'البوتاجاز والوقود': 'Butane & Fuel',
  'المطاحن والصوامع': 'Mills & Silos',

  // ===== المخابز البلدية والمعادلات =====
  'إضافة مخبز جديد': 'Add New Bakery',
  'تعديل بيانات المخبز': 'Edit Bakery Details',
  'ملف المخبز الكامل': 'Full Bakery Profile',
  'اضغط لفتح ملف المخبز': 'Click to open bakery profile',
  'رقم ماكينة POS': 'POS Machine #',
  'رقم ماكينة': 'Machine #',
  'رقم المخبز': 'Bakery #',
  'اسم المخبز': 'Bakery Name',
  'اسم صاحب المخبز': 'Bakery Owner Name',
  'صاحب المخبز': 'Bakery Owner',
  'المدير المسؤول': 'Responsible Manager',
  'المخبز والقرية': 'Bakery & Village',
  'القرية / الوحدة المحلية': 'Village / Local Unit',
  'القرية / الشياخة': 'Village / District',
  'القرية / الوحدة': 'Village / Unit',
  'الوحدة المحلية': 'Local Unit',
  'الوحدات المحلية': 'Local Units',
  'وحدة محلية': 'Local Unit',
  'الإدارة التموينية': 'Supply Administration',
  'الحصة التأمينية': 'Insurance Quota',
  'الحصة الفعلية': 'Actual Quota',
  'الحصة المقررة': 'Approved Quota',
  'الحصة اليومية': 'Daily Quota',
  'متوسط ٢٠٢٣': '2023 Avg',
  'متوسط ٢٠٢٤': '2024 Avg',
  'متوسط ٢٠٢٥': '2025 Avg',
  'الأرغفة اليومية': 'Daily Loaves',
  'عدد الأرغفة اليومية': 'Daily Loaves Count',
  'الفرق التراكمي': 'Cumulative Variance',
  'المبلغ التأميني': 'Insurance Deposit',
  'رغيف / فرد': 'Loaves / Person',
  'شيكارة / يوم': 'Sacks / Day',
  'خبز بلدي مدعم': 'Subsidized Baladi Bread',
  'بلدي مدعم (ماو)': 'Subsidized Baladi (Maw)',
  'آلي كامل': 'Fully Automated',
  'نصف آلي': 'Semi-Automated',
  'غاز طبيعي': 'Natural Gas',
  'سولار': 'Diesel',
  'مازوت': 'Mazut',
  'طباقي': 'Tabaqi',
  'ممتاز أ': 'Grade A+',
  'حاسبة مخالفات المخابز': 'Bakery Violation Calculator',
  'حاسبة نقص وزن الرغيف': 'Bread Underweight Calculator',
  'القرار الوزاري ١٧٥ لسنة ٢٠٢٤': 'Ministerial Decree 175/2024',
  'القرار الوزاري 175 لسنة 2024': 'Ministerial Decree 175/2024',
  'التوجيه الوزاري رقم ٥ لسنة ٢٠٢٦': 'Ministerial Directive 5/2026',
  'الوزن المقرر': 'Official Weight',
  'الوزن الرسمي': 'Official Weight',
  'الوزن الفعلي': 'Actual Weight',
  'سعر الشيكارة': 'Sack Price',
  'نقص وزن الرغيف': 'Bread Underweight',
  'التصرف في حصة الدقيق': 'Flour Quota Misappropriation',

  // ===== مديونيات المخابز والمديونيات الكبرى =====
  'المديونيات الكبرى والمتابعة المالية': 'Major Debts & Financial Follow-up',
  'حد المديونية الكبرى': 'Major Debt Threshold',
  'سجل المديونيات الرئيسية': 'Main Debts Registry',
  'سجل التحصيلات والسدادات': 'Collections & Payments Log',
  'جداول الجدولة والأقساط': 'Schedules & Installments',
  'سجل المخالفات والتصالحات والتظلمات': 'Violations, Settlements & Appeals',
  'سجل المتابعات والمديونيات الكبرى': 'Follow-ups & Major Debts Log',
  'تسجيل سداد': 'Record Payment',
  'إضافة مديونية جديدة': 'Add New Debt',
  'رقم المديونية': 'Debt #',
  'إجمالي المديونية': 'Total Debt',
  'إجمالي المديونيات': 'Total Debts',
  'إجمالي المسدد': 'Total Paid',
  'إجمالي المتبقي': 'Total Remaining',
  'نسبة السداد': 'Payment Ratio',
  'نسبة التحصيل': 'Collection Rate',
  'حالة السداد': 'Payment Status',
  'دفعة سداد': 'Payment Installment',
  'دفعة كاملة': 'Full Payment',
  'رقم الدفعة': 'Payment #',
  'رقم الإيصال': 'Receipt #',
  'رقم الجدول': 'Schedule #',
  'رقم القسط': 'Installment #',
  'قيمة القسط': 'Installment Amount',
  'تاريخ الاستحقاق': 'Due Date',
  'تاريخ السداد الفعلي': 'Actual Payment Date',
  'أيام التأخير': 'Overdue Days',
  'الأيام المتبقية': 'Days Remaining',
  'قيد مديونية': 'Debt Entry',
  'قيد عكسي': 'Reverse Entry',
  'ملغى بقيد عكسي': 'Reversed Entry',
  'ملغي بقرار معتمد': 'Cancelled by Approved Decision',
  'تسوية / خصم': 'Settlement / Discount',
  'تسوية / رد معتمد': 'Approved Settlement / Refund',
  'صافي المستحق': 'Net Due',
  'سداد شهري': 'Monthly Payment',
  'سداد أسبوعي': 'Weekly Payment',
  'مسدد بالكامل': 'Fully Paid',
  'مسدد جزئيًا': 'Partially Paid',
  'مسدد جزئياً': 'Partially Paid',
  'غير مسدد': 'Unpaid',
  'غير مجدول': 'Unscheduled',
  'تم السداد': 'Paid',
  'تم التسوية': 'Settled',
  'مؤجل بموافقة': 'Deferred (Approved)',
  'مستحق اليوم': 'Due Today',
  'إخطار بتأخر السداد': 'Overdue Payment Notice',
  'متابعة دورية': 'Periodic Follow-up',
  'قيد المتابعة': 'Under Follow-up',

  // ===== التراخيص والبطاقة الضريبية والسجل التجاري =====
  'تاريخ انتهاء البطاقة الضريبية': 'Tax Card Expiry Date',
  'تاريخ انتهاء السجل التجاري': 'Commercial Reg. Expiry Date',
  'تاريخ انتهاء الترخيص': 'License Expiry Date',
  'انتهاء البطاقة الضريبية': 'Tax Card Expiry',
  'انتهاء السجل التجاري': 'Commercial Reg. Expiry',
  'انتهاء الترخيص': 'License Expiry',
  'انتهاء الضريبية': 'Tax Card Expiry',
  'انتهاء السجل': 'CR Expiry',
  'انتهاء البطاقة': 'Card Expiry',
  'البطاقة الضريبية (وانتهاؤها)': 'Tax Card & Expiry',
  'السجل التجاري (وانتهاؤه)': 'Commercial Reg. & Expiry',
  'رقم الترخيص (وانتهاؤه)': 'License # & Expiry',
  'البطاقة الضريبية وانتهاؤها': 'Tax Card & Expiry',
  'السجل التجاري وانتهاؤه': 'Commercial Reg. & Expiry',
  'رقم البطاقة الضريبية': 'Tax Card #',
  'رقم السجل التجاري': 'Commercial Reg. #',
  'رقم الترخيص': 'License #',
  'البطاقة الضريبية': 'Tax Card',
  'السجل التجاري': 'Commercial Register',
  'تاريخ الانتهاء': 'Expiry Date',
  'تاريخ الإصدار': 'Issue Date',

  // ===== التجارة الداخلية والسلع التموينية =====
  'سجل المحلات والمنشآت التجارية': 'Commercial Establishments Registry',
  'سجل المنشآت التجارية': 'Commercial Establishments',
  'اسم المحل أو المنشأة': 'Shop / Establishment Name',
  'اسم المنشأة / المخبز / المستودع': 'Establishment / Bakery / Depot Name',
  'اسم المنشأة': 'Establishment Name',
  'كود المنشأة / السجل': 'Establishment / Record Code',
  'كود المنشأة': 'Establishment Code',
  'صاحب المنشأة': 'Establishment Owner',
  'تجار المستودعات': 'Depot Merchants',
  'مستودعات البوتاجاز': 'Butane Depots',
  'محطات الوقود': 'Fuel Stations',
  'تجار المواد البترولية': 'Petroleum Merchants',
  'المواد البترولية': 'Petroleum Materials',
  'المنتج البترولي': 'Petroleum Product',
  'الحملات التموينية': 'Inspection Campaigns',
  'حملة تموينية': 'Inspection Campaign',
  'تقارير الحملات والمخالفات': 'Campaigns & Violations Reports',
  'تقارير المنشآت والتراخيص': 'Establishments & Licenses Reports',
  'تقارير المواد البترولية ومحطات الوقود': 'Petroleum & Fuel Stations Reports',
  'تقارير البوتاجاز': 'Butane Reports',
  'تقارير الأسواق والأسعار': 'Markets & Prices Reports',
  'تقارير المديونيات والتحصيل': 'Debts & Collections Reports',
  'تقارير المهام والأداء': 'Tasks & Performance Reports',
  'دفتر حركة المخازن': 'Warehouse Movement Ledger',
  'المشتريات والتوريدات': 'Purchases & Supplies',
  'مخزن الجملة الرئيسي': 'Main Wholesale Warehouse',
  'الرصيد الافتتاحي': 'Opening Balance',
  'الكمية الواردة': 'Incoming Quantity',
  'الكمية الموزعة': 'Distributed Quantity',
  'المنصرف المعتمد': 'Approved Dispensed',
  'تم الصرف': 'Dispensed',
  'عدد المستفيدين': 'Beneficiaries Count',
  'المستفيدين': 'Beneficiaries',
  'المستفيدون': 'Beneficiaries',
  'مستفيد': 'Beneficiary',
  'اسم التاجر / صاحب المخبز': 'Merchant / Bakery Owner',
  'اسم التاجر': 'Merchant Name',
  'حالة الاعتماد': 'Approval Status',
  'حالة المحضر': 'Report Status',
  'رقم المحضر': 'Report #',
  'تاريخ المحضر': 'Report Date',
  'رقم المخالفة': 'Violation #',
  'نوع المخالفة': 'Violation Type',
  'رقم المضبوطات': 'Seizure #',
  'المضبوطات': 'Seizures',
  'التحفظات': 'Holds / Confiscations',
  'التصالحات': 'Settlements',
  'نوع الحركة': 'Transaction Type',
  'الرقم القومي': 'National ID',
  'رقم الهاتف': 'Phone Number',
  'رقم الملف': 'File #',
  'التاريخ والوقت': 'Date & Time',
  'سكر معبأ تمويني ١ كجم': 'Subsidized Packaged Sugar 1kg',
  'كيس ١ كجم': '1kg Pack',

  // ===== إدارة القرى والقوائم المنسدلة وإعادة ضبط المصنع =====
  '١. القرى والوحدات المحلية (التدرج الذكي)': '1. Villages & Local Units (Hierarchy)',
  '٢. إدارة القوائم المنسدلة (مجموعات منظمة)': '2. Smart Dropdown Lists (Groups)',
  '٣. التراخيص والبطاقات والسجلات (الكالندر)': '3. Licenses, Tax & CR (Calendar)',
  '٤. تخصيص رؤوس أعمدة الجداول': '4. Table Column Headers',
  'إضافة قرية جديدة': 'Add New Village',
  'إضافة وحدة محلية': 'Add Local Unit',
  'إضافة عنصر جديد': 'Add New Item',
  'إضافة قائمة جديدة': 'Add New List',
  'إعادة ضبط المصنع': 'Factory Reset',
  'تأكيد إعادة ضبط المصنع': 'CONFIRM FACTORY RESET',
  'المحافظات والمراكز والإدارات': 'Governorates, Centers & Admins',
  'القرى والوحدات المحلية': 'Villages & Local Units',
  'أنواع الأنشطة': 'Activity Types',
  'أنواع التراخيص': 'License Types',
  'أنواع السلع': 'Commodity Types',
  'أنواع المخالفات': 'Violation Types',
  'حالات السجلات': 'Record Statuses',
  'أنواع المستندات': 'Document Types',
  'أنواع الجهات': 'Authority Types',
  'أنواع البطاقات التموينية': 'Ration Card Types',
  'أنواع المنافذ التموينية': 'Supply Outlet Types',
  'الوحدة المحلية (تتحدث تلقائياً)': 'Local Unit (Auto-Cascading)',
  'القسم المختص': 'Department / Section',

  // ===== الشكاوى والمهام والإدارة =====
  'موضوع البلاغ أو الشكوى': 'Report / Complaint Subject',
  'حالة الشكوى': 'Complaint Status',
  'جاري الفحص والتفتيش': 'Under Inspection',
  'تم الحل وإعادة التفعيل': 'Resolved & Reactivated',
  'تمت المعاينة والمطابقة': 'Inspected & Verified',
  'الموظف المكلف': 'Assigned Employee',
  'الموعد النهائي': 'Deadline',
  'نسبة الإنجاز': 'Completion Rate',
  'اسم المستخدم': 'Username',
  'كلمة المرور': 'Password',
  'المسمى الوظيفي': 'Job Title',
  'تثبيت القائمة مفتوحة': 'Pin Sidebar Open',
  'إلغاء تثبيت القائمة': 'Unpin Sidebar',
  'توسيع القائمة الجانبية': 'Expand Sidebar',
  'طي القائمة الجانبية': 'Collapse Sidebar',
  'إغلاق القائمة': 'Close Menu',

  // ===== الحالات والأزرار والكلمات المتكررة =====
  'معتمد نشط': 'Approved & Active',
  'موقوف مؤقتاً': 'Temporarily Suspended',
  'مغلق إدارياً': 'Administratively Closed',
  'قيد المراجعة': 'Under Review',
  'قيد التحقيق': 'Under Investigation',
  'قيد الفحص': 'Under Examination',
  'تحت الفحص': 'Under Inspection',
  'تنتظر اعتماد': 'Pending Approval',
  'محال للنيابة': 'Referred to Prosecution',
  'محضر رسمي': 'Official Report',
  'غير مسجل': 'Unregistered',
  'غير محدد': 'Unspecified',
  'عاجلة جداً': 'Critical / Urgent',
  'تم الرد': 'Replied',
  'لوحة التحكم': 'Dashboard',
  'تصدير Excel': 'Export Excel',
  'حفظ التغييرات': 'Save Changes',
  'تطبيق الفلتر': 'Apply Filter',
  'إعادة تعيين': 'Reset',
  'بحث متقدم': 'Advanced Search',
  'كل الأقسام': 'All Sections',
  'كل القرى': 'All Villages',
  'كل الحالات': 'All Statuses',
  'كل الوحدات': 'All Units',
  'جميع الأقسام': 'All Sections',
  'جميع القرى': 'All Villages',
  'جميع الحالات': 'All Statuses',
  'جميع الوحدات': 'All Units',
  'جميع المخابز': 'All Bakeries',
  'بنجاح.': 'successfully.',
  'بنجاح': 'successfully',
  'الإجراءات': 'Actions',
  'إجراءات': 'Actions',
  'الحالة': 'Status',
  'التاريخ': 'Date',
  'القرية': 'Village',
  'الكل': 'All',
  'معتمد': 'Approved',
  'مطابق': 'Compliant',
  'مكتملة': 'Completed',
  'منفذة': 'Executed',
  'مرفوض': 'Rejected',
  'مسودة': 'Draft',
  'منتهي': 'Expired',
  'قارب': 'Expiring Soon',
  'متأخر': 'Overdue',
  'متأخرة': 'Overdue',
  'متعثر': 'Defaulted',
  'متوقف': 'Stopped',
  'مغلق': 'Closed',
  'مغلقة': 'Closed',
  'ملغي': 'Cancelled',
  'نشط': 'Active',
  'نشطة': 'Active',
  'مفعّل': 'Active',
  'معطّل': 'Disabled',
  'جديدة': 'New',
  'جديد': 'New',
  'عاجل': 'Urgent',
  'مرتفع': 'High',
  'متوسط': 'Medium',
  'منخفض': 'Low',
  'عادي': 'Normal',
  'نموذجي': 'Model / Ideal',
  'متصل': 'Connected',
  'محالة': 'Referred',
  'معلوماتي': 'Informational',
  'إضافة': 'Add',
  'تعديل': 'Edit',
  'حذف': 'Delete',
  'عرض': 'View',
  'حفظ': 'Save',
  'إلغاء': 'Cancel',
  'إغلاق': 'Close',
  'تصدير': 'Export',
  'طباعة': 'Print',
  'تحديث': 'Refresh',
  'اعتماد': 'Approve',
  'الاعتماد': 'Approval',
  'تفعيل': 'Enable',
  'تعطيل': 'Disable',
  'بحث': 'Search',
  'المتبقي': 'Remaining',
  'المسدد': 'Paid',
  'الإجمالي': 'Total',
  'المبلغ': 'Amount',
  'الكمية': 'Quantity',
  'التصنيف': 'Category',
  'النوع': 'Type',
  'السلعة': 'Commodity',
  'المنتج': 'Product',
  'المخبز': 'Bakery',
  'المنشأة': 'Establishment',
  'التاجر': 'Merchant',
  'المخزن': 'Warehouse',
  'الجهة': 'Authority',
  'المفتش': 'Inspector',
  'المستخدم': 'User',
  'المسؤول': 'Officer',
  'المواطن': 'Citizen',
  'النتيجة': 'Result',
  'البيان': 'Description',
  'المرجع': 'Reference',
  'الطريقة': 'Method',
  'العملية': 'Operation',
  'ملاحظات': 'Notes',
  'الكود': 'Code',
  'الوحدة': 'Unit',
  'السنة': 'Year',
  'الهاتف': 'Phone',
  'المديونيات': 'Debts',
  'مديونية': 'Debt',
  'مخالفة': 'Violation',
  'محضر': 'Report',
  'المحضر': 'Report',
  'غرامة': 'Fine',
  'مهمة': 'Task',
  'قسط': 'Installment',
  'شيكارة': 'Sack',
  'أسطوانة': 'Cylinder',
  'رغيف': 'Loaf',
  'لتر': 'L',
  'كجم': 'kg',
  'طن': 'Ton',
  'جم': 'g',
  'ج.م': 'EGP',
  'يوم': 'day',
  'أيام': 'days',
  'شهري': 'Monthly',
  'أسبوعي': 'Weekly',
  'يومي': 'Daily',
  'سنوي': 'Annual',
  'سجل': 'record',
  'سجلات': 'records',
  'مخبز': 'bakery',
  'منشأة': 'establishment',
  'ماكينة': 'POS',
  'الإفراج': 'Release',
  'الإعدام': 'Destruction',
  'الإضافة': 'Addition',
  'الاستحقاق': 'Due',
  'ينتهي:': 'Expires:',
  'المتبقي:': 'Remaining:',
  'القرية:': 'Village:',
  'صاحب المخبز:': 'Owner:',
  'رقم': '#',
  'يناير': 'Jan',
  'فبراير': 'Feb',
  'مارس': 'Mar',
  'أبريل': 'Apr',
  'مايو': 'May',
  'يونيو': 'Jun',
  'يوليو': 'Jul',
  'أغسطس': 'Aug',
  'سبتمبر': 'Sep',
  'أكتوبر': 'Oct',
  'نوفمبر': 'Nov',
  'ديسمبر': 'Dec',
  'السبت': 'Saturday',
  'الأحد': 'Sunday',
  'الإثنين': 'Monday',
  'الاثنين': 'Monday',
  'الثلاثاء': 'Tuesday',
  'الأربعاء': 'Wednesday',
  'الخميس': 'Thursday',
  'الجمعة': 'Friday',
};

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// مفاتيح مرتبة تنازلياً حسب الطول لضمان تطابق العبارات المركبة أولاً
const SORTED_PHRASE_KEYS = Object.keys(AR_TO_EN_PHRASES).sort((a, b) => b.length - a.length);

// تجميع regex سريع للعبارات الطويلة والقصيرة
const COMBINED_PHRASE_REGEX = new RegExp(
  SORTED_PHRASE_KEYS.map(escapeRegExp).join('|'),
  'g'
);

const HAS_ARABIC_REGEX = /[\u0600-\u06FF]/;

/**
 * ترجمة نص واجهة مستخدم من العربية إلى الإنجليزية مع الحفاظ على الأسماء الشخصية والبيانات المدخلة
 */
export function translateUiTextToEnglish(raw: string): string {
  if (!raw || !HAS_ARABIC_REGEX.test(raw)) {
    return raw ? toWesternDigits(raw) : raw;
  }

  const leadingWs = raw.match(/^\s*/)?.[0] ?? '';
  const trailingWs = raw.match(/\s*$/)?.[0] ?? '';
  const core = raw.trim();
  if (!core) return raw;

  // 1. تطابق تام مباشر (مع أو بدون نقطتين نهائيتين)
  const exact = AR_TO_EN_PHRASES[core];
  if (exact) return `${leadingWs}${exact}${trailingWs}`;

  if (core.endsWith(':')) {
    const withoutColon = core.slice(0, -1).trim();
    if (AR_TO_EN_PHRASES[withoutColon]) {
      return `${leadingWs}${AR_TO_EN_PHRASES[withoutColon]}:${trailingWs}`;
    }
  }

  // 2. ترجمة الأنماط المركبة المتكررة في الواجهة (التواريخ/العدادات/البحث)
  let translated = core
    .replace(/متبقي\s+([٠-٩0-9]+)\s+يوماً?/g, (_, d) => `${toWesternDigits(d)} days left`)
    .replace(/منتهي\s+منذ\s+([٠-٩0-9]+)\s+يوماً?/g, (_, d) => `Expired ${toWesternDigits(d)}d ago`)
    .replace(/ينتهي\s+خلال\s+([٠-٩0-9]+)\s+يوماً?/g, (_, d) => `Expires in ${toWesternDigits(d)}d`)
    .replace(/بحث\s+في\s+/g, 'Search ')
    .replace(/ابحث\s+عن\s+/g, 'Search ')
    .replace(/ابحث\s+بـ\s*/g, 'Search by ')
    .replace(/تصفية\s+حسب\s+/g, 'Filter by ')
    .replace(/عرض\s+تفاصيل\s+/g, 'View details: ')
    .replace(/تعديل\s+بيانات\s+/g, 'Edit details: ')
    .replace(/إجمالي\s+عدد\s+/g, 'Total ')
    .replace(/عدد\s+/g, 'Count of ');

  // 3. استبدال العبارات والمصطلحات القياسية مع احترام حدود الكلمات العربية
  translated = translated.replace(COMBINED_PHRASE_REGEX, (match, offset: number, full: string) => {
    const prev = offset > 0 ? full[offset - 1] : '';
    const next = offset + match.length < full.length ? full[offset + match.length] : '';
    const prevIsAr = /[\u0600-\u06FF]/.test(prev);
    const nextIsAr = /[\u0600-\u06FF]/.test(next);
    // منع قص جزء داخلي من كلمة عربية أطول (مثل اسم شخص أو قرية)
    if (prevIsAr || nextIsAr) return match;
    return AR_TO_EN_PHRASES[match] ?? match;
  });

  // 4. تحويل الأرقام العربية إلى إنجليزية في وضع اللغة الإنجليزية
  translated = toWesternDigits(translated);

  return `${leadingWs}${translated}${trailingWs}`;
}

interface StoredElementAttrs {
  placeholder?: string | null;
  title?: string | null;
  ariaLabel?: string | null;
}

const originalTextMap = new WeakMap<Text, string>();
const trackedTextNodes = new Set<Text>();
const originalAttrMap = new WeakMap<Element, StoredElementAttrs>();
const trackedAttrElements = new Set<Element>();

let activeObserver: MutationObserver | null = null;
let isApplyingTranslation = false;

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return true;
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') {
    return true;
  }
  if (el.closest('[data-no-translate="true"]')) return true;
  return false;
}

function translateTextNode(node: Text): void {
  const parent = node.parentElement;
  if (!parent || shouldSkipElement(parent)) return;
  const current = node.nodeValue ?? '';
  if (!current.trim()) return;

  // حفظ النص الأصلي العربي قبل أول ترجمة، أو تحديثه إذا أعادت React كتابة نص عربي جديد
  if (!originalTextMap.has(node) || HAS_ARABIC_REGEX.test(current)) {
    originalTextMap.set(node, current);
  }
  const source = originalTextMap.get(node) ?? current;
  const translated = translateUiTextToEnglish(source);
  if (translated !== current) {
    node.nodeValue = translated;
    trackedTextNodes.add(node);
  }
}

function translateElementAttrs(el: Element): void {
  if (shouldSkipElement(el)) return;
  const attrs: ('placeholder' | 'title' | 'aria-label')[] = ['placeholder', 'title', 'aria-label'];
  let stored = originalAttrMap.get(el);

  for (const attr of attrs) {
    const val = el.getAttribute(attr);
    if (!val || !HAS_ARABIC_REGEX.test(val)) continue;
    if (!stored) {
      stored = {
        placeholder: el.getAttribute('placeholder'),
        title: el.getAttribute('title'),
        ariaLabel: el.getAttribute('aria-label'),
      };
      originalAttrMap.set(el, stored);
      trackedAttrElements.add(el);
    } else {
      if (attr === 'placeholder') stored.placeholder = val;
      if (attr === 'title') stored.title = val;
      if (attr === 'aria-label') stored.ariaLabel = val;
    }
    const nextVal = translateUiTextToEnglish(val);
    if (nextVal !== val) {
      el.setAttribute(attr, nextVal);
    }
  }
}

function translateSubtree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateElementAttrs(root as Element);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current: Node | null = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      translateTextNode(current as Text);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      translateElementAttrs(current as Element);
    }
    current = walker.nextNode();
  }
}

/**
 * تفعيل الترجمة الكاملة الحية لجميع مكونات المنظومة عند اختيار الإنجليزية
 */
export function enableFullEnglishDomTranslation(): void {
  if (typeof document === 'undefined' || !document.body) return;
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }

  isApplyingTranslation = true;
  try {
    translateSubtree(document.body);
  } finally {
    isApplyingTranslation = false;
  }

  activeObserver = new MutationObserver((mutations) => {
    if (isApplyingTranslation) return;
    isApplyingTranslation = true;
    try {
      for (const m of mutations) {
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(m.target as Text);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((n) => translateSubtree(n));
        } else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
          translateElementAttrs(m.target as Element);
        }
      }
    } finally {
      isApplyingTranslation = false;
    }
  });

  activeObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label'],
  });
}

/**
 * إيقاف الترجمة واستعادة كافة النصوص العربية الأصلية حرفياً عند العودة للعربية
 */
export function restoreOriginalArabicDom(): void {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }

  isApplyingTranslation = true;
  try {
    trackedTextNodes.forEach((node) => {
      if (node.isConnected) {
        const orig = originalTextMap.get(node);
        if (orig !== undefined && node.nodeValue !== orig) {
          node.nodeValue = orig;
        }
      }
    });
    trackedTextNodes.clear();

    trackedAttrElements.forEach((el) => {
      if (el.isConnected) {
        const stored = originalAttrMap.get(el);
        if (stored) {
          if (stored.placeholder !== null && stored.placeholder !== undefined) {
            el.setAttribute('placeholder', stored.placeholder);
          }
          if (stored.title !== null && stored.title !== undefined) {
            el.setAttribute('title', stored.title);
          }
          if (stored.ariaLabel !== null && stored.ariaLabel !== undefined) {
            el.setAttribute('aria-label', stored.ariaLabel);
          }
        }
      }
    });
    trackedAttrElements.clear();
  } finally {
    isApplyingTranslation = false;
  }
}
