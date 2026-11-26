import {
  DailyTaskRecord,
  DebtThresholdSetting,
  InternalChatConversation,
  InternalChatMessage,
  OfficialViolationReportRecord,
  UnifiedSystemNotification,
  ViolationCatalogItem,
  ViolationIssuingAuthorityConfig,
} from '@/types';

const THRESHOLD_STORAGE_KEY = 'gharbia_supply_major_debt_threshold_v1';
const AUTHORITIES_STORAGE_KEY = 'gharbia_supply_violation_authorities_v1';
const CATALOG_STORAGE_KEY = 'gharbia_supply_violation_catalog_v1';
const OFFICIAL_REPORTS_STORAGE_KEY = 'gharbia_supply_official_violation_reports_v1';
const DAILY_TASKS_STORAGE_KEY = 'gharbia_supply_daily_tasks_v1';
const CHAT_CONVS_STORAGE_KEY = 'gharbia_supply_chat_conversations_v1';
const CHAT_MSGS_STORAGE_KEY = 'gharbia_supply_chat_messages_v1';
const UNIFIED_NOTIFS_STORAGE_KEY = 'gharbia_supply_unified_notifications_v1';

// ============================================================================
// ١. إعدادات حد المديونية الكبرى وسجل التغييرات التاريخي
// ============================================================================
export const DEFAULT_DEBT_THRESHOLD_SETTING: DebtThresholdSetting = {
  thresholdAmountEgp: 5000,
  warningApproachPercent: 80,
  scopeType: 'all',
  scopeTargetValue: 'جميع المخابز',
  comparisonRule: 'gte',
  updatedBy: 'Eng. Ahmed El-Hosseiny — Tel: 01004414038',
  updatedAt: '2026-11-25T09:00:00Z',
  history: [
    {
      id: 'th-hist-1',
      thresholdAmountEgp: 10000,
      warningApproachPercent: 85,
      scopeType: 'all',
      scopeTargetValue: 'جميع المخابز',
      comparisonRule: 'gte',
      changedBy: 'أ. خالد محمد الشناوي',
      changedAt: '2026-10-01T10:00:00Z',
      notes: 'الحد المبدئي للربع الأخير من العام المالي',
    },
    {
      id: 'th-hist-2',
      thresholdAmountEgp: 5000,
      warningApproachPercent: 80,
      scopeType: 'all',
      scopeTargetValue: 'جميع المخابز',
      comparisonRule: 'gte',
      changedBy: 'Eng. Ahmed El-Hosseiny — Tel: 01004414038',
      changedAt: '2026-11-25T09:00:00Z',
      notes: 'تخفيض الحد المالي لتشديد الرقابة المبكرة على المديونيات المتراكمة',
    },
  ],
};

export function loadDebtThresholdSetting(): DebtThresholdSetting {
  if (typeof window === 'undefined') return DEFAULT_DEBT_THRESHOLD_SETTING;
  try {
    const raw = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_DEBT_THRESHOLD_SETTING;
  } catch {
    return DEFAULT_DEBT_THRESHOLD_SETTING;
  }
}

export function saveDebtThresholdSetting(setting: DebtThresholdSetting): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THRESHOLD_STORAGE_KEY, JSON.stringify(setting));
  } catch {
    // ignore
  }
}

// ============================================================================
// ٢. قائمة الجهات المحررة للمحاضر (١١ جهة رسمية قابلة للإدارة)
// ============================================================================
export const INITIAL_VIOLATION_AUTHORITIES: ViolationIssuingAuthorityConfig[] = [
  { id: 'auth-01', name: 'إدارة تموين مركز المحلة الكبرى', category: 'إدارات تموينية', isActive: true },
  { id: 'auth-02', name: 'الإدارات التموينية الأخرى بالمحافظة', category: 'إدارات تموينية', isActive: true },
  { id: 'auth-03', name: 'مديرية التموين والتجارة الداخلية بالغربية', category: 'ديوان المديرية', isActive: true },
  { id: 'auth-04', name: 'إدارة الرقابة التموينية', category: 'رقابة وتفتيش', isActive: true },
  { id: 'auth-05', name: 'إدارة الرقابة التجارية', category: 'رقابة وتفتيش', isActive: true },
  { id: 'auth-06', name: 'مباحث التموين', category: 'جهات أمنية ورقابية', isActive: true },
  { id: 'auth-07', name: 'شرطة التموين', category: 'جهات أمنية ورقابية', isActive: true },
  { id: 'auth-08', name: 'جهاز حماية المستهلك (عند اختصاصه)', category: 'أجهزة رقابية', isActive: true },
  { id: 'auth-09', name: 'لجان المرور والتفتيش التمويني', category: 'لجان ميدانية', isActive: true },
  { id: 'auth-10', name: 'لجان الجرد والتفتيش', category: 'لجان ميدانية', isActive: true },
  { id: 'auth-11', name: 'جهات أخرى', category: 'عام', isActive: true },
];

export function loadViolationAuthorities(): ViolationIssuingAuthorityConfig[] {
  if (typeof window === 'undefined') return INITIAL_VIOLATION_AUTHORITIES;
  try {
    const raw = localStorage.getItem(AUTHORITIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_VIOLATION_AUTHORITIES;
  } catch {
    return INITIAL_VIOLATION_AUTHORITIES;
  }
}

export function saveViolationAuthorities(list: ViolationIssuingAuthorityConfig[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTHORITIES_STORAGE_KEY, JSON.stringify(list));
}

// ============================================================================
// ٣. الدليل الشامل لأنواع مخالفات المخابز (المجموعات الثماني أ — ح مع السند القانوني)
// ============================================================================
export const INITIAL_VIOLATION_CATALOG: ViolationCatalogItem[] = [
  // أ- مخالفات إنتاج الخبز والمواصفات
  { id: 'vc-a1', code: 'A-01', groupCode: 'أ', groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات', title: 'نقص وزن الرغيف', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — جدول شرائح نقص الوزن', competentAuthority: 'إدارة الرقابة التموينية / إدارة التموين', approvedActionAndPenalty: 'غرامة معادلة الحصة التأمينية × المعامل القانوني + غلق عند الشريحة الرابعة', defaultUnit: 'جرام', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1750, isActive: true },
  { id: 'vc-a2', code: 'A-02', groupCode: 'أ', groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات', title: 'إنتاج خبز غير مطابق للمواصفات', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ بند المواصفات الفنية', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة مالية معتمدة وإنذار بالمطابقة', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1000, isActive: true },
  { id: 'vc-a3', code: 'A-03', groupCode: 'أ', groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات', title: 'عدم الالتزام بالأوزان المقررة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'تحرير محضر نقص وزن وتطبيق شريحة المخالفة', defaultUnit: 'جرام', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1500, isActive: true },
  { id: 'vc-a4', code: 'A-04', groupCode: 'أ', groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات', title: 'سوء جودة الخبز', legalBasisDecree: 'التوجيه الوزاري ٣٠ لسنة ٢٠١٧ وتعديلاته ١٧٥/٢٠٢٤', legalArticle: 'بند جودة الرغيف البلدي', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة جودة معتمدة وإثبات بسجل الزيارات', defaultUnit: 'عينة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-a5', code: 'A-05', groupCode: 'أ', groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات', title: 'عدم مطابقة شكل أو حجم الرغيف للمواصفات', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'ضوابط القطر والاستدارة والنضج', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'غرامة مواصفات ظاهرية ٥٠٠ إلى ١٠٠٠ ج.م', defaultUnit: 'عينة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-a6', code: 'A-06', groupCode: 'أ', groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات', title: 'إنتاج خبز غير صالح للاستهلاك', legalBasisDecree: 'القانون ٤٨ لسنة ١٩٤١ والقرار ١٧٥ لسنة ٢٠٢٤', legalArticle: 'مواد الغش التجاري وسلامة الغذاء', competentAuthority: 'مباحث التموين / النيابة المختصة', approvedActionAndPenalty: 'مصادرة الكمية وإحالة للنيابة وغرامة مضاعفة', defaultUnit: 'رغيف', hasFinancialFineByDefault: true, defaultBaseFineEgp: 5000, isActive: true },
  { id: 'vc-a7', code: 'A-07', groupCode: 'أ', groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات', title: 'عدم الالتزام بالمواصفات الفنية المعتمدة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'غرامة إدارية معتمدة', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1000, isActive: true },
  { id: 'vc-a8', code: 'A-08', groupCode: 'أ', groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات', title: 'التلاعب في أوزان الخبز', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — تكرار التلاعب في الأوزان', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'مضاعفة الغرامة المالية وخصم من الحصة أو الغلق', defaultUnit: 'جرام', hasFinancialFineByDefault: true, defaultBaseFineEgp: 3000, isActive: true },
  { id: 'vc-a9', code: 'A-09', groupCode: 'أ', groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات', title: 'عدم الالتزام بنسب الخلط المقررة (إذا كانت واجبة التطبيق)', legalBasisDecree: 'تعليمات وزارة التموين المنظمة لاستخراج ٨٧٫٥٪', legalArticle: 'ضوابط الخلط والتصنيع', competentAuthority: 'لجان الجرد والتفتيش', approvedActionAndPenalty: 'فحص معملي وغرامة وفق التقرير الفني', defaultUnit: 'شيكارة', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },

  // ب- مخالفات التصرف في الدقيق والحصص
  { id: 'vc-b1', code: 'B-01', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'تجميع الدقيق', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'مادة تجميع الدقيق المدعم', competentAuthority: 'مباحث التموين / إدارة الرقابة', approvedActionAndPenalty: 'تحصيل مثلي قيمة الدقيق المجمع بالسعر الحر ومصادرة المضبوطات', defaultUnit: 'شيكارة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2820, isActive: true },
  { id: 'vc-b2', code: 'B-02', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'التصرف في الدقيق المدعم', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — التصرف في حصة الدقيق', competentAuthority: 'لجان الجرد والتفتيش / مباحث التموين', approvedActionAndPenalty: 'سداد ضعف قيمة الدقيق المتصرف فيه وتخفيض الحصة عند التكرار', defaultUnit: 'شيكارة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2820, isActive: true },
  { id: 'vc-b3', code: 'B-03', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'بيع الدقيق المدعم في السوق السوداء', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ والقرار ١٧٥/٢٠٢٤', legalArticle: 'جرائم التصرف في السلع التموينية المدعمة', competentAuthority: 'مباحث التموين والنيابة العامة', approvedActionAndPenalty: 'محضر جنحة تموينية + تحصيل فروق الأسعار مضاعفة + غلق المخبز', defaultUnit: 'شيكارة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 5640, isActive: true },
  { id: 'vc-b4', code: 'B-04', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'تهريب الدقيق', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ والقرار ١٧٥/٢٠٢٤', legalArticle: 'مواد تهريب الدقيق التمويني', competentAuthority: 'شرطة ومباحث التموين', approvedActionAndPenalty: 'ضبط وتحريز وإحالة للنيابة وتحصيل قيمة الدقيق مضاعفة', defaultUnit: 'شيكارة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 5640, isActive: true },
  { id: 'vc-b5', code: 'B-05', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'استخدام الدقيق في غير الغرض المخصص له', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'حظر استخدام دقيق ٨٧٫٥٪ في غير الخبز البلدي', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'تحصيل ضعف قيمة الدقيق المستخدم', defaultUnit: 'شيكارة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2820, isActive: true },
  { id: 'vc-b6', code: 'B-06', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'التصرف في الحصة التموينية', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤', competentAuthority: 'لجان الجرد والتفتيش', approvedActionAndPenalty: 'سداد مثلي قيمة الحصة المتصرف فيها', defaultUnit: 'شيكارة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2820, isActive: true },
  { id: 'vc-b7', code: 'B-07', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'عدم استلام الحصة المقررة دون مبرر', legalBasisDecree: 'تعليمات منظومة صرف الدقيق التمويني', legalArticle: 'ضوابط الاستلام اليومي من المطحن', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'إنذار رسمي ومراجعة موقف التشغيل والحصة', defaultUnit: 'يوم', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-b8', code: 'B-08', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'إثبات استلام كميات غير مستلمة فعلياً', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'التلاعب في السجلات والأرصدة', competentAuthority: 'لجان الجرد والتفتيش', approvedActionAndPenalty: 'محضر إثبات حالة وغرامة مالية وفق العجز الفعلي', defaultUnit: 'شيكارة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2820, isActive: true },
  { id: 'vc-b9', code: 'B-09', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'وجود عجز في رصيد الدقيق', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — عجز الجرد الفعلي عن الرصيد الدفتري', competentAuthority: 'لجان الجرد والتفتيش', approvedActionAndPenalty: 'تحصيل ضعف قيمة شكائر العجز بالسعر المعتمد', defaultUnit: 'شيكارة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2820, isActive: true },
  { id: 'vc-b10', code: 'B-10', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'التلاعب في أذون الصرف والاستلام', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'مخالفات المستندات التموينية', competentAuthority: 'مديرية التموين والتجارة الداخلية بالغربية', approvedActionAndPenalty: 'إحالة للشؤون القانونية وتحصيل الفروق المالية', defaultUnit: 'إذن', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-b11', code: 'B-11', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'عدم إثبات الوارد والمنصرف', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'إمساك السجلات التموينية', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'غرامة إدارية لعدم انتظام القيد بالسجلات', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-b12', code: 'B-12', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'صرف كميات بالمخالفة للحصة المعتمدة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'ضوابط الحصص التأمينية والفعلية', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'تحصيل فروق الدعم على الكميات المنصرفة بالمخالفة', defaultUnit: 'شيكارة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1410, isActive: true },
  { id: 'vc-b13', code: 'B-13', groupCode: 'ب', groupTitle: 'ب- مخالفات التصرف في الدقيق والحصص', title: 'التلاعب في بيانات الإنتاج أو الصرف (ماكينة POS)', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — ضرب وهمي أو تلاعب بماكينة الصرف', competentAuthority: 'مديرية التموين / شركة البطاقات الذكية', approvedActionAndPenalty: 'تحصيل ضعف تكلفة الدعم للمبيعات الوهمية + غلق المخبز', defaultUnit: 'رغيف', hasFinancialFineByDefault: true, defaultBaseFineEgp: 4500, isActive: true },

  // ج- مخالفات التشغيل والإنتاج
  { id: 'vc-c1', code: 'C-01', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'التوقف عن الإنتاج دون إخطار أو مبرر معتمد', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — التوقف بدون إذن رسمي', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'غرامة يومية عن كل يوم توقف وإعادة توزيع الحصة مؤقتاً', defaultUnit: 'يوم', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1000, isActive: true },
  { id: 'vc-c2', code: 'C-02', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'الغلق دون تصريح', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — غلق المخبز في مواعيد العمل', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'غرامة غلق بدون تصريح وإنذار بسحب الحصة', defaultUnit: 'يوم', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1000, isActive: true },
  { id: 'vc-c3', code: 'C-03', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'عدم الالتزام بمواعيد التشغيل', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'ضوابط مواعيد بدء وانتهاء الخبز', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'غرامة مخالفة مواعيد التشغيل الرسمية', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-c4', code: 'C-04', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'عدم تشغيل المخبز في المواعيد المحددة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'ضوابط مواعيد التشغيل', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'غرامة تأخير تشغيل المخبز', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-c5', code: 'C-05', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'عدم انتظام الإنتاج', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'تعليمات استمرارية الإنتاج خلال اليوم', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'إنذار رسمي أو غرامة وفق محضر المعاينة', defaultUnit: 'محضر', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-c6', code: 'C-06', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'عدم تشغيل خطوط الإنتاج', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'تشغيل الطاقة الإنتاجية المرخصة', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'مراجعة الحصة اليومية وتحرير محضر إثبات حالة', defaultUnit: 'خط إنتاج', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-c7', code: 'C-07', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'مخالفة التعليمات المنظمة للتشغيل', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'التعليمات التشغيلية للمخابز البلدية', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'جزاء إداري أو مالي وفق البند المخالف', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-c8', code: 'C-08', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'تشغيل المخبز بعمالة غير مستوفية للاشتراطات المطلوبة', legalBasisDecree: 'اشتراطات التراخيص والشهادات الصحية', legalArticle: 'ضوابط العاملين بالمخابز', competentAuthority: 'لجان التفتيش المشتركة', approvedActionAndPenalty: 'إخطار لاستيفاء الشهادات الصحية والغرامة المقررة', defaultUnit: 'عامل', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-c9', code: 'C-09', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'عدم وجود سجلات التشغيل المطلوبة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — عدم إمساك سجل الزيارات والتشغيل', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة عدم وجود سجل زيارات بالمخبز', defaultUnit: 'سجل', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-c10', code: 'C-10', groupCode: 'ج', groupTitle: 'ج- مخالفات التشغيل والإنتاج', title: 'عدم إثبات كميات الإنتاج الفعلية', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'ضوابط القيد اليومي للإنتاج', competentAuthority: 'لجان الجرد والتفتيش', approvedActionAndPenalty: 'غرامة مخالفة القيد الدفتري', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },

  // د- مخالفات النظافة والصحة والسلامة
  { id: 'vc-d1', code: 'D-01', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'عدم نظافة المخبز', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'اشتراطات النظافة العامة للمخبز', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'غرامة عدم نظافة المخبز وإنذار بتلافي المخالفة', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-d2', code: 'D-02', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'عدم نظافة أدوات ومعدات الإنتاج', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — نظافة المعجن والطاولات والأواني', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة عدم نظافة أدوات العجين والخبز', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-d3', code: 'D-03', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'سوء حالة العجان أو الفرن أو السيور', legalBasisDecree: 'اشتراطات التشغيل الفني للمخابز', legalArticle: 'الصيانة الوقائية لخطوط الإنتاج', competentAuthority: 'لجان التفتيش الفني', approvedActionAndPenalty: 'مهلة للإصلاح الفوري أو غرامة فنية', defaultUnit: 'معدة', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-d4', code: 'D-04', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'وجود حشرات أو قوارض', legalBasisDecree: 'قوانين الرقابة الصحية والتموينية', legalArticle: 'سلامة بيئة إنتاج الغذاء', competentAuthority: 'لجان التفتيش المشتركة / الصحة والتموين', approvedActionAndPenalty: 'محضر فوري وغلق إداري لحين التطهير والمطابقة', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2000, isActive: true },
  { id: 'vc-d5', code: 'D-05', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'سوء تخزين الدقيق', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'ضوابط تشوين الدقيق على قواعد خشبية (بالتات)', competentAuthority: 'لجان الجرد والتفتيش', approvedActionAndPenalty: 'غرامة مخالفة أصول التخزين وإنذار فوري', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-d6', code: 'D-06', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'تخزين الدقيق بطريقة غير سليمة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'تهوية ونظافة مخزن الدقيق بالمخبز', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'غرامة سوء التخزين', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-d7', code: 'D-07', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'وجود مخلفات داخل أماكن الإنتاج', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'اشتراطات النظافة والسلامة', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'غرامة نظافة وإزالة فورية للمخلفات', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-d8', code: 'D-08', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'عدم الالتزام باشتراطات الصحة والسلامة', legalBasisDecree: 'اشتراطات السلامة المهنية والصحية بالمخابز', legalArticle: 'ضوابط الصحة والسلامة', competentAuthority: 'لجان التفتيش المشتركة', approvedActionAndPenalty: 'محضر مخالفة اشتراطات صحية', defaultUnit: 'محضر', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-d9', code: 'D-09', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'عدم توافر وسائل الوقاية المطلوبة', legalBasisDecree: 'اشتراطات الأمن الصناعي والدفاع المدني', legalArticle: 'طفايات الحريق ووسائل الأمان', competentAuthority: 'لجان المرور والتفتيش', approvedActionAndPenalty: 'إنذار باستكمال وسائل الوقاية خلال مهلة محددة', defaultUnit: 'محضر', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-d10', code: 'D-10', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'سوء حالة أماكن تداول الخبز', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'نظافة منافذ البيع وأقفاص التهوية', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة إدارية معتمدة', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-d11', code: 'D-11', groupCode: 'د', groupTitle: 'د- مخالفات النظافة والصحة والسلامة', title: 'عدم الالتزام بالاشتراطات البيئية والصحية المقررة', legalBasisDecree: 'لوائح التراخيص والبيئة للمخابز', legalArticle: 'المدخنة والوقود والانبعاثات', competentAuthority: 'لجان التفتيش المختصة', approvedActionAndPenalty: 'إخطار رسمي لتوفيق الأوضاع', defaultUnit: 'محضر', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },

  // هـ- مخالفات اللوحات والإعلانات والإفصاح
  { id: 'vc-e1', code: 'E-01', groupCode: 'هـ', groupTitle: 'هـ- مخالفات اللوحات والإعلانات والإفصاح', title: 'عدم وجود لوحة مواعيد التشغيل', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — الإعلان الظاهر عن مواعيد العمل', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'غرامة عدم تعليق لوحة البيانات والمواعيد', defaultUnit: 'لوحة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-e2', code: 'E-02', groupCode: 'هـ', groupTitle: 'هـ- مخالفات اللوحات والإعلانات والإفصاح', title: 'عدم وجود لوحة بيانات المخبز', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — لوحة البيانات الرسمية بواجهة المخبز', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'غرامة عدم وضع لوحة بيانات المخبز والحصة والوزن', defaultUnit: 'لوحة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-e3', code: 'E-03', groupCode: 'هـ', groupTitle: 'هـ- مخالفات اللوحات والإعلانات والإفصاح', title: 'عدم إعلان سعر الخبز أو البيانات الواجب إعلانها', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤ والتوجيه ٥', legalArticle: 'الإعلان عن السعر والوزن المقرر', competentAuthority: 'إدارة الرقابة التموينية والتجارية', approvedActionAndPenalty: 'غرامة عدم الإعلان عن الأسعار والأوزان', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-e4', code: 'E-04', groupCode: 'هـ', groupTitle: 'هـ- مخالفات اللوحات والإعلانات والإفصاح', title: 'عدم وضع اللوحات الإرشادية المطلوبة', legalBasisDecree: 'تعليمات مديرية التموين بالغربية', legalArticle: 'ضوابط الإفصاح وأرقام الشكاوى', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'إنذار بتركيب اللوحات الإرشادية فوراً', defaultUnit: 'لوحة', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-e5', code: 'E-05', groupCode: 'هـ', groupTitle: 'هـ- مخالفات اللوحات والإعلانات والإفصاح', title: 'وجود بيانات غير صحيحة باللوحات', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'مطابقة لوحة الواجهة لبيانات الترخيص والحصة', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'غرامة تدوين بيانات مخالفة للواقع باللوحة', defaultUnit: 'لوحة', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-e6', code: 'E-06', groupCode: 'هـ', groupTitle: 'هـ- مخالفات اللوحات والإعلانات والإفصاح', title: 'عدم إظهار بيانات الحصة أو التعليمات المطلوبة للمواطنين', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'حق المواطن في معرفة وزن وسعر الرغيف والحصة', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة إدارية ٥٠٠ ج.م', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },

  // و- مخالفات الميزان والتعامل مع المواطنين
  { id: 'vc-f1', code: 'F-01', groupCode: 'و', groupTitle: 'و- مخالفات الميزان والتعامل مع المواطنين', title: 'عدم وجود ميزان صالح للاستخدام (إذا كان مطلوباً)', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — توفير ميزان حساس مدموغ بالمخبز', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة عدم وجود ميزان حساس صالح بالمخبز', defaultUnit: 'ميزان', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-f2', code: 'F-02', groupCode: 'و', groupTitle: 'و- مخالفات الميزان والتعامل مع المواطنين', title: 'ميزان غير مضبوط أو غير صالح', legalBasisDecree: 'قانون الموازين والمقاييس والقرار ١٧٥/٢٠٢٤', legalArticle: 'معايرة ودمغ الميزان', competentAuthority: 'مصلحة دمغ المصوغات والموازين / الرقابة التموينية', approvedActionAndPenalty: 'تحريز الميزان غير المضبوط وغرامة مالية', defaultUnit: 'ميزان', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-f3', code: 'F-03', groupCode: 'و', groupTitle: 'و- مخالفات الميزان والتعامل مع المواطنين', title: 'عدم تمكين المواطن من الاطلاع على الوزن عند وجوبه', legalBasisDecree: 'تعليمات الرقابة التموينية وخدمة المواطنين', legalArticle: 'حق المواطن في مراجعة وزن الرغيف', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'إنذار رسمي وفحص وزن الخبز بالمخبز', defaultUnit: 'شكوى', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-f4', code: 'F-04', groupCode: 'و', groupTitle: 'و- مخالفات الميزان والتعامل مع المواطنين', title: 'سوء معاملة المواطنين', legalBasisDecree: 'ضوابط تشغيل المخابز البلدية وخدمة الجمهور', legalArticle: 'التزامات صاحب المخبز والمدير المسؤول', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'تحقيق إداري وإنذار رسمي بملف المخبز', defaultUnit: 'شكوى', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-f5', code: 'F-05', groupCode: 'و', groupTitle: 'و- مخالفات الميزان والتعامل مع المواطنين', title: 'عدم الالتزام بقواعد توزيع الخبز', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'ضوابط صرف الخبز بالبطاقات التموينية', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة مخالفة نظام التوزيع المعتمد', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1000, isActive: true },
  { id: 'vc-f6', code: 'F-06', groupCode: 'و', groupTitle: 'و- مخالفات الميزان والتعامل مع المواطنين', title: 'التمييز غير المشروع في تقديم الخدمة', legalBasisDecree: 'تعليمات تنظيم صرف الخبز المدعم للمواطنين', legalArticle: 'أولوية الصرف ومنع المحاباة', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'إنذار رسمي أو جزاء وفق التحقيق', defaultUnit: 'محضر', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-f7', code: 'F-07', groupCode: 'و', groupTitle: 'و- مخالفات الميزان والتعامل مع المواطنين', title: 'الامتناع عن البيع دون سبب مشروع', legalBasisDecree: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥ والقرار ١٧٥/٢٠٢٤', legalArticle: 'الامتناع عن بيع سلعة مدعمة مع توافرها', competentAuthority: 'مباحث التموين / إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة الامتناع عن بيع الخبز المدعم للمواطنين', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2000, isActive: true },
  { id: 'vc-f8', code: 'F-08', groupCode: 'و', groupTitle: 'و- مخالفات الميزان والتعامل مع المواطنين', title: 'التلاعب في عدد الأرغفة أو الكميات المسلمة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'صرف عدد أرغفة أقل مما تم خصمه من البطاقة', competentAuthority: 'إدارة الرقابة التموينية / مباحث التموين', approvedActionAndPenalty: 'تحصيل ضعف قيمة الدعم للأرغفة المستولى عليها + غرامة', defaultUnit: 'رغيف', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2500, isActive: true },

  // ز- مخالفات التراخيص والمستندات والسجلات
  { id: 'vc-g1', code: 'G-01', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'انتهاء ترخيص المخبز', legalBasisDecree: 'قانون المحال العامة والقرارات التموينية المنظمة', legalArticle: 'وجوب تجديد رخصة تشغيل المخبز', competentAuthority: 'إدارة تموين مركز المحلة الكبرى / الوحدة المحلية', approvedActionAndPenalty: 'إنذار رسمي بالتجديد خلال المهلة القانونية أو وقف الصرف', defaultUnit: 'رخصة', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-g2', code: 'G-02', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'عدم وجود الترخيص المطلوب', legalBasisDecree: 'قانون المحال العامة والقرارات التموينية', legalArticle: 'حظر التشغيل بدون ترخيص سارٍ', competentAuthority: 'مديرية التموين / الوحدة المحلية', approvedActionAndPenalty: 'محضر إدارة بدون ترخيص وإيقاف الحصة لحين تقنين الوضع', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 3000, isActive: true },
  { id: 'vc-g3', code: 'G-03', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'مخالفة شروط الترخيص', legalBasisDecree: 'شروط الترخيص التمويني للمخابز البلدية', legalArticle: 'الالتزام بنوع الخبز وخط الإنتاج والوقود المرخص', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة مخالفة شروط الترخيص وإلزام بإزالة المخالفة', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1000, isActive: true },
  { id: 'vc-g4', code: 'G-04', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'عدم تحديث بيانات المخبز', legalBasisDecree: 'تعليمات تحديث قاعدة بيانات المخابز', legalArticle: 'تحديث بيانات المالك والمدير المسؤول والبطاقة الضريبية', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'إنذار رسمي باستكمال تحديث الملف خلال ١٥ يوماً', defaultUnit: 'ملف', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-g5', code: 'G-05', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'عدم تقديم المستندات المطلوبة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'تمكين الحملة من الاطلاع على المستندات والفواتير', competentAuthority: 'لجان الجرد والتفتيش', approvedActionAndPenalty: 'محضر عدم تقديم مستندات وغرامة إدارية', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-g6', code: 'G-06', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'عدم وجود السجلات الإلزامية', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — سجل الزيارات وسجل الدقيق', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة عدم وجود السجلات الرسمية بالمخبز', defaultUnit: 'سجل', hasFinancialFineByDefault: true, defaultBaseFineEgp: 500, isActive: true },
  { id: 'vc-g7', code: 'G-07', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'عدم انتظام تسجيل البيانات', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'انتظام القيد اليومي بالسجلات', competentAuthority: 'لجان المرور والتفتيش التمويني', approvedActionAndPenalty: 'إنذار أو غرامة عدم انتظام القيد', defaultUnit: 'سجل', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-g8', code: 'G-08', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'وجود بيانات غير صحيحة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'إثبات بيانات مخالفة للحقيقة بالسجلات', competentAuthority: 'لجان الجرد والتفتيش', approvedActionAndPenalty: 'إحالة للتحقيق القانوني وغرامة مالية', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1000, isActive: true },
  { id: 'vc-g9', code: 'G-09', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'عدم إخطار الإدارة بالتغييرات الجوهرية', legalBasisDecree: 'لائحة تشغيل المخابز التموينية', legalArticle: 'الإخطار بتغيير المدير المسؤول أو التعديلات الهندسية', competentAuthority: 'إدارة تموين مركز المحلة الكبرى', approvedActionAndPenalty: 'إنذار رسمي وإلزام بتقنين التغيير', defaultUnit: 'إخطار', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-g10', code: 'G-10', groupCode: 'ز', groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات', title: 'مخالفة شروط التشغيل المعتمدة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'شروط التشغيل القياسية', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'غرامة مخالفة شروط التشغيل', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1000, isActive: true },

  // ح- مخالفات مالية وإدارية أخرى
  { id: 'vc-h1', code: 'H-01', groupCode: 'ح', groupTitle: 'ح- مخالفات مالية وإدارية أخرى', title: 'وجود مديونية مستحقة غير مسددة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤ واللوائح المالية', legalArticle: 'تحصيل مستحقات الهيئة العامة للسلع التموينية والمديرية', competentAuthority: 'قسم مديونيات المخابز والشؤون المالية', approvedActionAndPenalty: 'إنذار بالسداد الفوري أو الجدولة المعتمدة أو خصم من المستحقات', defaultUnit: 'مطالبة', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-h2', code: 'H-02', groupCode: 'ح', groupTitle: 'ح- مخالفات مالية وإدارية أخرى', title: 'عدم سداد المستحقات في مواعيدها', legalBasisDecree: 'اللوائح المالية وشروط عقد وجدولة المديونية', legalArticle: 'التأخر عن سداد الأقساط المستحقة', competentAuthority: 'قسم مديونيات المخابز', approvedActionAndPenalty: 'إخطار بتأخر السداد واتخاذ إجراءات التحصيل الإداري', defaultUnit: 'قسط', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-h3', code: 'H-03', groupCode: 'ح', groupTitle: 'ح- مخالفات مالية وإدارية أخرى', title: 'التلاعب في مستندات الصرف', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤ وقانون العقوبات', legalArticle: 'التلاعب في فواتير وأذون الصرف', competentAuthority: 'الشؤون القانونية والنيابة المختصة', approvedActionAndPenalty: 'إحالة للنيابة وتحصيل المبالغ المستحقة بالكامل', defaultUnit: 'مستند', hasFinancialFineByDefault: true, defaultBaseFineEgp: 5000, isActive: true },
  { id: 'vc-h4', code: 'H-04', groupCode: 'ح', groupTitle: 'ح- مخالفات مالية وإدارية أخرى', title: 'التلاعب في مستندات السداد', legalBasisDecree: 'اللوائح المالية الحكومية وقانون العقوبات', legalArticle: 'تزوير أو كشط إيصالات السداد', competentAuthority: 'الشؤون المالية والقانونية', approvedActionAndPenalty: 'إلغاء القيد غير الصحيح وإحالة للنيابة المختصة', defaultUnit: 'إيصال', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
  { id: 'vc-h5', code: 'H-05', groupCode: 'ح', groupTitle: 'ح- مخالفات مالية وإدارية أخرى', title: 'عدم توريد المبالغ المستحقة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'توريد فروق الأسعار والغرامات المعتمدة', competentAuthority: 'قسم مديونيات المخابز', approvedActionAndPenalty: 'قيد المبلغ كمديونية واجبة التحصيل وإصدار مطالبة رسمية', defaultUnit: 'جنيه', hasFinancialFineByDefault: true, defaultBaseFineEgp: 2000, isActive: true },
  { id: 'vc-h6', code: 'H-06', groupCode: 'ح', groupTitle: 'ح- مخالفات مالية وإدارية أخرى', title: 'عدم الالتزام بالتعليمات والقرارات التموينية', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤ والكتب الدورية', legalArticle: 'مخالفة القرارات الوزارية السارية', competentAuthority: 'مديرية التموين والتجارة الداخلية بالغربية', approvedActionAndPenalty: 'تطبيق الجزاء الوارد بالقرار محل المخالفة', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 1000, isActive: true },
  { id: 'vc-h7', code: 'H-07', groupCode: 'ح', groupTitle: 'ح- مخالفات مالية وإدارية أخرى', title: 'تكرار المخالفة', legalBasisDecree: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤', legalArticle: 'المادة ١٤ — مضاعفة العقوبة والغرامة عند العود والتكرار', competentAuthority: 'إدارة الرقابة التموينية', approvedActionAndPenalty: 'مضاعفة المعامل القانوني للغرامة وتشديد التدبير الإداري', defaultUnit: 'محضر', hasFinancialFineByDefault: true, defaultBaseFineEgp: 3000, isActive: true },
  { id: 'vc-h8', code: 'H-08', groupCode: 'ح', groupTitle: 'ح- مخالفات مالية وإدارية أخرى', title: 'مخالفة أخرى يتم تعريفها بواسطة مسؤول النظام', legalBasisDecree: 'يحدد السند القانوني الرسمي وقت التحرير', legalArticle: 'وفق القرار أو الكتاب الدوري المعتمد', competentAuthority: 'الجهة المختصة المحررة للمحضر', approvedActionAndPenalty: 'لا تنشأ غرامة مالية إلا بعد تحديد السند القانوني المعتمد', defaultUnit: 'بند', hasFinancialFineByDefault: false, defaultBaseFineEgp: 0, isActive: true },
];

export function loadViolationCatalog(): ViolationCatalogItem[] {
  if (typeof window === 'undefined') return INITIAL_VIOLATION_CATALOG;
  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_VIOLATION_CATALOG;
  } catch {
    return INITIAL_VIOLATION_CATALOG;
  }
}

export function saveViolationCatalog(list: ViolationCatalogItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(list));
}

// ============================================================================
// ٤. محاضر المخالفات الرسمية متعددة البنود (Official Multi-Item Violation Reports)
// ============================================================================
export const INITIAL_OFFICIAL_VIOLATION_REPORTS: OfficialViolationReportRecord[] = [
  {
    id: 'ovr-2026-01',
    reportNumber: 'محضر-2026-104',
    caseNumber: 'جنحة تموينية ٤١٢ لسنة ٢٠٢٦ مركز المحلة',
    bakeryId: 'bak-102',
    bakeryNumber: '1085',
    bakeryName: 'مخبز النور المحمدي البلدي',
    ownerName: 'إبراهيم السيد أبو العلا',
    posNumber: 'POS-884195',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    phone: '01224587963',
    issuingAuthoritySnapshot: 'إدارة تموين مركز المحلة الكبرى',
    subDepartmentName: 'قسم الرقابة التموينية على المخابز',
    inspectorName: 'أ. خالد محمد الشناوي',
    reportDate: '2026-11-10',
    reportLocation: 'مقر المخبز بقرية الهياتم — مركز المحلة الكبرى',
    reportStatus: 'معتمد',
    paymentStatus: 'مسدد جزئياً',
    items: [
      {
        id: 'ovr-item-1',
        catalogItemId: 'vc-a1',
        groupTitle: 'أ- مخالفات إنتاج الخبز والمواصفات',
        violationTypeTitle: 'نقص وزن الرغيف',
        detailedDescription: 'إنتاج خبز بلدي مدعم ناقص الوزن بمقدار ١٢ جراماً في الرغيف الواحد (متوسط الوزن ٧٨ جم بدلاً من ٩٠ جم)',
        quantity: 12,
        unit: 'جرام',
        decreeOrArticleRef: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤ — المادة ١٤ (الشريحة الثانية)',
        competentAuthority: 'إدارة الرقابة التموينية',
        approvedMeasure: 'غرامة مالية طبقاً للمعادلة القانونية (معامل ×٢)',
        fineAmountEgp: 4000,
        dueDate: '2026-11-28',
        notes: 'تم وزن ٢٠ رغيفاً بحضور المدير المسؤول',
      },
      {
        id: 'ovr-item-2',
        catalogItemId: 'vc-e1',
        groupTitle: 'هـ- مخالفات اللوحات والإعلانات والإفصاح',
        violationTypeTitle: 'عدم وجود لوحة مواعيد التشغيل',
        detailedDescription: 'عدم تعليق لوحة مواعيد التشغيل والوزن المقرر في مكان ظاهر للمواطنين بواجهة المخبز',
        quantity: 1,
        unit: 'لوحة',
        decreeOrArticleRef: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤ — المادة ١٤',
        competentAuthority: 'إدارة تموين مركز المحلة الكبرى',
        approvedMeasure: 'غرامة إدارية معتمدة + إلزام بتعليق اللوحة',
        fineAmountEgp: 500,
        dueDate: '2026-11-28',
        notes: 'بند ثانٍ بذات المحضر الموحد',
      },
    ],
    totalFineAmountEgp: 4500,
    attachmentsList: ['صورة محضر الوزن الميداني ١٠٤.pdf', 'محضر معاينة اللوحة الإرشادية.jpg'],
    notes: 'تم اعتماد المحضر المتعدد البنود وترحيله إلى حساب المخبز بقسم المديونيات.',
    linkedDebtId: 'debt-101',
    linkedDebtNumber: 'DBT-2026-001',
    transferredToDebtsAt: '2026-11-11T10:00:00Z',
    transferredBy: 'Eng. Ahmed El-Hosseiny',
    createdBy: 'أ. خالد محمد الشناوي',
    createdAt: '2026-11-10T09:30:00Z',
  },
  {
    id: 'ovr-2026-02',
    reportNumber: 'محضر-2026-152',
    caseNumber: 'إداري تموين ٥١٩ لسنة ٢٠٢٦',
    bakeryId: 'bak-104',
    bakeryNumber: '1154',
    bakeryName: 'مخبز الهدى والنور الآلي',
    ownerName: 'عبد العزيز مصطفى الشرقاوي',
    posNumber: 'POS-884309',
    village: 'دمرو',
    localUnit: 'الوحدة المحلية بدمرو',
    phone: '01098745632',
    issuingAuthoritySnapshot: 'لجان المرور والتفتيش التمويني',
    subDepartmentName: 'اللجنة المشتركة للتفتيش على المخابز',
    inspectorName: 'أ. طارق عبد السلام (مفتش أول)',
    reportDate: '2026-11-23',
    reportLocation: 'قرية دمرو — مركز المحلة الكبرى',
    reportStatus: 'معتمد',
    paymentStatus: 'غير مسدد',
    items: [
      {
        id: 'ovr-item-3',
        catalogItemId: 'vc-d2',
        groupTitle: 'د- مخالفات النظافة والصحة والسلامة',
        violationTypeTitle: 'عدم نظافة أدوات ومعدات الإنتاج',
        detailedDescription: 'عدم نظافة المعجن وطاولات التقطيع وأقفاص التهوية وقت الحملة الصباحية',
        quantity: 1,
        unit: 'محضر',
        decreeOrArticleRef: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤ — المادة ١٤',
        competentAuthority: 'إدارة الرقابة التموينية',
        approvedMeasure: 'غرامة عدم نظافة أدوات العجين ٥٠٠ ج.م',
        fineAmountEgp: 500,
        dueDate: '2026-12-05',
        notes: 'تم التنبيه الفوري بالتنظيف',
      },
      {
        id: 'ovr-item-4',
        catalogItemId: 'vc-g6',
        groupTitle: 'ز- مخالفات التراخيص والمستندات والسجلات',
        violationTypeTitle: 'عدم وجود السجلات الإلزامية',
        detailedDescription: 'عدم وجود سجل الزيارات الرسمي المعتمد داخل المخبز وقت التفتيش',
        quantity: 1,
        unit: 'سجل',
        decreeOrArticleRef: 'القرار الوزاري ١٧٥ لسنة ٢٠٢٤ — المادة ١٤',
        competentAuthority: 'إدارة الرقابة التموينية',
        approvedMeasure: 'غرامة عدم إمساك سجل الزيارات ٥٠٠ ج.م',
        fineAmountEgp: 500,
        dueDate: '2026-12-05',
        notes: '',
      },
    ],
    totalFineAmountEgp: 1000,
    attachmentsList: ['تقرير لجنة المرور رقم ١٥٢-دمرو.pdf'],
    notes: 'محضر معتمد جاهز للترحيل الفوري إلى حساب المديونيات.',
    createdBy: 'أ. خالد محمد الشناوي',
    createdAt: '2026-11-23T11:20:00Z',
  },
];

export function loadOfficialViolationReports(): OfficialViolationReportRecord[] {
  if (typeof window === 'undefined') return INITIAL_OFFICIAL_VIOLATION_REPORTS;
  try {
    const raw = localStorage.getItem(OFFICIAL_REPORTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_OFFICIAL_VIOLATION_REPORTS;
  } catch {
    return INITIAL_OFFICIAL_VIOLATION_REPORTS;
  }
}

export function saveOfficialViolationReports(list: OfficialViolationReportRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OFFICIAL_REPORTS_STORAGE_KEY, JSON.stringify(list));
}

// ============================================================================
// ٥. المهام اليومية والمتابعة (Daily Tasks & Cross-Department Follow-up)
// ============================================================================
export const INITIAL_DAILY_TASKS: DailyTaskRecord[] = [
  {
    id: 'tsk-2026-001',
    taskNumber: 'TSK-2026-001',
    title: 'متابعة تحصيل وجدولة المديونية الكبرى لمخبز البركة البلدي (بشبيش)',
    description: 'مراجعة موقف التأخر في سداد القسط المستحق على مخبز البركة البلدي (POS-884412) بقرية بشبيش، والتواصل مع صاحب المخبز لتوقيع محضر الالتزام بالسداد أو اتخاذ الإجراء القانوني.',
    departmentId: 'd-03',
    departmentName: 'مديونيات أصحاب المخابز',
    primaryAssigneeId: 'usr-002',
    primaryAssigneeName: 'أ. خالد محمد الشناوي',
    participantIds: ['usr-001', 'usr-002'],
    participantNames: ['Eng. Ahmed El-Hosseiny', 'أ. خالد محمد الشناوي'],
    createdById: 'usr-001',
    createdByName: 'Eng. Ahmed El-Hosseiny',
    createdAt: '2026-11-22T09:00:00Z',
    startDate: '2026-11-22',
    dueDate: '2026-11-27',
    priority: 'عاجلة جداً',
    taskType: 'متابعة مديونية',
    confidentiality: 'عام للإدارة',
    status: 'جارٍ التنفيذ',
    progressPercent: 65,
    completionReportText: 'تم توجيه الإنذار الرسمي رقم NOT-2026-409 وحضر المدير المسؤول ووعد بتوريد القسط المتأخر خلال ٤٨ ساعة.',
    requiredInstructions: 'إرفاق صورة إيصال السداد فور التوريد بالخزينة أو تحديث جدول الأقساط.',
    notes: 'مرتبط بملف المديونية رقم DBT-2026-002',
    attachments: ['صورة_إنذار_السداد_409.pdf', 'كشف_حساب_مخبز_البركة.pdf'],
    linkedRecordType: 'debt',
    linkedRecordId: 'debt-102',
    linkedRecordLabel: 'مديونية DBT-2026-002 — مخبز البركة البلدي (٩,٠٠٠ ج.م)',
    linkedDeptCode: 'DEBTS',
    comments: [
      {
        id: 'tcm-1',
        authorId: 'usr-001',
        authorName: 'Eng. Ahmed El-Hosseiny',
        text: 'يرجى التأكد من عدم السماح بتأجيل القسط إلا بعد سداد ٣٠٪ على الأقل من المتأخرات.',
        createdAt: '2026-11-22T10:15:00Z',
      },
      {
        id: 'tcm-2',
        authorId: 'usr-002',
        authorName: 'أ. خالد محمد الشناوي',
        text: 'تم استدعاء صاحب المخبز وجارٍ تحصيل القسط الأول اليوم بالخزينة.',
        createdAt: '2026-11-24T11:30:00Z',
        attachmentName: 'محضر_تعهد_سداد_بشبيش.pdf',
      },
    ],
    actionLogs: [
      {
        id: 'tal-1',
        actorName: 'Eng. Ahmed El-Hosseiny',
        actionTitle: 'إنشاء وإسناد المهمة',
        details: 'تم إسناد المهمة إلى أ. خالد محمد الشناوي بأولوية عاجلة جداً',
        timestamp: '2026-11-22T09:00:00Z',
      },
      {
        id: 'tal-2',
        actorName: 'أ. خالد محمد الشناوي',
        actionTitle: 'تحديث نسبة الإنجاز إلى ٦٥٪',
        details: 'تسليم الإنذار الرسمي وتوثيق تعهد السداد',
        timestamp: '2026-11-24T11:30:00Z',
      },
    ],
    updatedAt: '2026-11-24T11:30:00Z',
  },
  {
    id: 'tsk-2026-002',
    taskNumber: 'TSK-2026-002',
    title: 'حملة تفتيش صباحية على أوزان ومواصفات الخبز بقرية الهياتم وصفط تراب',
    description: 'المرور الميداني على مخابز قرية الهياتم وصفط تراب لمراجعة أوزان الرغيف البلدي المدعم (٩٠ جراماً) والتأكد من صلاحية الموازين الحساسة ولوحات مواعيد التشغيل.',
    departmentId: 'd-02',
    departmentName: 'منظومة الرقابة على المخابز',
    primaryAssigneeId: 'usr-002',
    primaryAssigneeName: 'أ. خالد محمد الشناوي',
    participantIds: ['usr-002'],
    participantNames: ['أ. خالد محمد الشناوي'],
    createdById: 'usr-001',
    createdByName: 'Eng. Ahmed El-Hosseiny',
    createdAt: '2026-11-20T08:00:00Z',
    startDate: '2026-11-21',
    dueDate: '2026-11-26',
    priority: 'مهمة',
    taskType: 'فحص أو تفتيش',
    confidentiality: 'مقيد للمكلفين',
    status: 'تنتظر اعتماد',
    progressPercent: 100,
    completionReportText: 'تم المرور على ٦ مخابز، وتحرير محضر نقص وزن واحد، والتأكد من انتظام باقي المخابز بكامل الحصة التأمينية.',
    requiredInstructions: 'تسجيل نتائج الحملة في قسم التفتيش والرقابة واعتماد محاضر المخالفات.',
    notes: 'بناءً على خطة الرقابة الأسبوعية لإدارة تموين مركز المحلة الكبرى',
    attachments: ['تقرير_حملة_الهياتم_وصفط_تراب.pdf'],
    linkedRecordType: 'bakery',
    linkedRecordId: 'bak-102',
    linkedRecordLabel: 'مخبز النور المحمدي البلدي — الهياتم (POS-884195)',
    linkedDeptCode: 'BAK',
    comments: [
      {
        id: 'tcm-3',
        authorId: 'usr-002',
        authorName: 'أ. خالد محمد الشناوي',
        text: 'تم استكمال التقرير الميداني ورفع المرفقات، وبانتظار اعتماد الإغلاق.',
        createdAt: '2026-11-25T08:30:00Z',
      },
    ],
    actionLogs: [
      {
        id: 'tal-3',
        actorName: 'أ. خالد محمد الشناوي',
        actionTitle: 'تقديم تقرير الإنجاز النهائي (١٠٠٪)',
        details: 'رفع تقرير الحملة وطلب اعتماد إغلاق المهمة',
        timestamp: '2026-11-25T08:30:00Z',
      },
    ],
    updatedAt: '2026-11-25T08:30:00Z',
  },
  {
    id: 'tsk-2026-003',
    taskNumber: 'TSK-2026-003',
    title: 'مراجعة وتجديد تراخيص المخابز المنتهية والتي قاربت على الانتهاء',
    description: 'مراجعة ملف مخبز الإخلاص التعاوني بالبنوان (رخصة منتهية) ومخبز النور المحمدي بالهياتم (بطاقة ضريبية قاربت على الانتهاء) واستيفاء مستندات التجديد.',
    departmentId: 'd-02',
    departmentName: 'منظومة الرقابة على المخابز',
    primaryAssigneeId: 'usr-001',
    primaryAssigneeName: 'Eng. Ahmed El-Hosseiny',
    participantIds: ['usr-001', 'usr-002'],
    participantNames: ['Eng. Ahmed El-Hosseiny', 'أ. خالد محمد الشناوي'],
    createdById: 'usr-002',
    createdByName: 'أ. خالد محمد الشناوي',
    createdAt: '2026-11-18T09:00:00Z',
    startDate: '2026-11-18',
    dueDate: '2026-11-23',
    priority: 'مهمة',
    taskType: 'متابعة تراخيص',
    confidentiality: 'عام للإدارة',
    status: 'متأخرة',
    progressPercent: 40,
    requiredInstructions: 'استلام صورة إيصال السداد الضريبي وشهادة التجديد من الوحدة المحلية.',
    notes: 'تأخر صاحب المخبز في تقديم أصل البطاقة الضريبية المجددة',
    attachments: ['إخطار_تجديد_ترخيص_1120.pdf'],
    linkedRecordType: 'license',
    linkedRecordId: 'bak-103',
    linkedRecordLabel: 'ترخيص مخبز الإخلاص التعاوني #1120 — البنوان',
    linkedDeptCode: 'BAK',
    comments: [],
    actionLogs: [
      {
        id: 'tal-4',
        actorName: 'أ. خالد محمد الشناوي',
        actionTitle: 'إنشاء مهمة متابعة تراخيص',
        details: 'تحديد موعد نهائي ٢٠٢٦/١١/٢٣ لاستيفاء المستندات',
        timestamp: '2026-11-18T09:00:00Z',
      },
    ],
    updatedAt: '2026-11-23T12:00:00Z',
  },
  {
    id: 'tsk-2026-004',
    taskNumber: 'TSK-2026-004',
    title: 'مطابقة أرصدة وحصص الدقيق التمويني استخراج ٨٧٫٥٪ مع المطاحن والشون',
    description: 'مراجعة البيان الشهري لإجمالي الحصص التأمينية والفعلية المنصرفة لمخابز مركز المحلة الكبرى ومطابقتها مع أذون الصرف من المطاحن التموينية.',
    departmentId: 'd-10',
    departmentName: 'المطاحن التموينية',
    primaryAssigneeId: 'usr-001',
    primaryAssigneeName: 'Eng. Ahmed El-Hosseiny',
    participantIds: ['usr-001'],
    participantNames: ['Eng. Ahmed El-Hosseiny'],
    createdById: 'usr-001',
    createdByName: 'Eng. Ahmed El-Hosseiny',
    createdAt: '2026-11-15T10:00:00Z',
    startDate: '2026-11-15',
    dueDate: '2026-11-20',
    priority: 'متوسطة',
    taskType: 'متابعة توريد أو صرف',
    confidentiality: 'عام للإدارة',
    status: 'مكتملة',
    progressPercent: 100,
    completionReportText: 'تمت المطابقة بالكامل بنسبة ١٠٠٪ لجميع المخابز النشطة ولا توجد فروق في أذون الصرف.',
    requiredInstructions: 'اعتماد محضر المطابقة الشهري وحفظه بالأرشيف الإلكتروني.',
    notes: 'مهمة شهرية مكتملة ومعتمدة',
    attachments: ['محضر_مطابقة_حصص_الدقيق_نوفمبر_2026.pdf'],
    linkedRecordType: 'bakery',
    linkedRecordId: 'bak-101',
    linkedRecordLabel: 'بيان حصص الدقيق — إدارة تموين مركز المحلة الكبرى',
    linkedDeptCode: 'MILLS',
    comments: [],
    actionLogs: [
      {
        id: 'tal-5',
        actorName: 'Eng. Ahmed El-Hosseiny',
        actionTitle: 'اعتماد وإغلاق المهمة',
        details: 'اكتمال المطابقة واعتماد التقرير النهائي',
        timestamp: '2026-11-20T14:00:00Z',
      },
    ],
    updatedAt: '2026-11-20T14:00:00Z',
    approvedBy: 'Eng. Ahmed El-Hosseiny',
    approvedAt: '2026-11-20T14:00:00Z',
  },
];

export function loadDailyTasks(): DailyTaskRecord[] {
  if (typeof window === 'undefined') return INITIAL_DAILY_TASKS;
  try {
    const raw = localStorage.getItem(DAILY_TASKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_DAILY_TASKS;
  } catch {
    return INITIAL_DAILY_TASKS;
  }
}

export function saveDailyTasks(list: DailyTaskRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(list));
}

// ============================================================================
// ٦. المحادثات الداخلية المباشرة بين الموظفين والشات المرتبط بالمهام
// ============================================================================
export const INITIAL_CHAT_CONVERSATIONS: InternalChatConversation[] = [
  {
    id: 'conv-direct-1',
    title: 'محادثة مباشرة: مدير النظام ⇄ مدير إدارة تموين المحلة',
    type: 'direct',
    participantIds: ['usr-001', 'usr-002'],
    participantNames: ['Eng. Ahmed El-Hosseiny', 'أ. خالد محمد الشناوي'],
    isPinned: true,
    createdAt: '2026-11-20T09:00:00Z',
    updatedAt: '2026-11-25T10:15:00Z',
  },
  {
    id: 'conv-dept-bak',
    title: 'غرفة عمليات الرقابة على المخابز ومديونيات المخابز',
    type: 'department_group',
    departmentId: 'd-02',
    participantIds: ['usr-001', 'usr-002'],
    participantNames: ['Eng. Ahmed El-Hosseiny', 'أ. خالد محمد الشناوي'],
    isPinned: true,
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-25T09:45:00Z',
  },
  {
    id: 'conv-cross-all',
    title: 'المجموعة المشتركة بين الإدارات التموينية والرقابة بالغربية',
    type: 'cross_department_group',
    participantIds: ['usr-001', 'usr-002'],
    participantNames: ['Eng. Ahmed El-Hosseiny', 'أ. خالد محمد الشناوي'],
    isPinned: false,
    createdAt: '2026-11-05T08:00:00Z',
    updatedAt: '2026-11-24T13:20:00Z',
  },
  {
    id: 'conv-task-001',
    title: 'محادثة المهمة TSK-2026-001: متابعة مديونية مخبز البركة البلدي',
    type: 'task_chat',
    linkedTaskId: 'tsk-2026-001',
    linkedTaskNumber: 'TSK-2026-001',
    participantIds: ['usr-001', 'usr-002'],
    participantNames: ['Eng. Ahmed El-Hosseiny', 'أ. خالد محمد الشناوي'],
    isPinned: false,
    createdAt: '2026-11-22T09:05:00Z',
    updatedAt: '2026-11-25T10:00:00Z',
  },
];

export const INITIAL_CHAT_MESSAGES: InternalChatMessage[] = [
  {
    id: 'msg-101',
    conversationId: 'conv-direct-1',
    senderId: 'usr-002',
    senderName: 'أ. خالد محمد الشناوي',
    senderRoleLabel: 'مدير إدارة تموين مركز المحلة الكبرى',
    text: 'السلام عليكم يا باشمهندس أحمد، تم مراجعة كشف المديونيات الكبرى وتحديث محاضر نقص الوزن لقرية الهياتم.',
    sentAt: '2026-11-25T09:30:00Z',
    readByUserIds: ['usr-001', 'usr-002'],
    attachmentName: 'بيان_محاضر_الهياتم_نوفمبر.pdf',
    attachmentType: 'مستند إداري',
  },
  {
    id: 'msg-102',
    conversationId: 'conv-direct-1',
    senderId: 'usr-001',
    senderName: 'Eng. Ahmed El-Hosseiny',
    senderRoleLabel: 'مدير النظام الرئيسي',
    text: 'وعليكم السلام أستاذ خالد، ممتاز جداً. تم تفعيل الربط التلقائي بين محاضر المخالفات المعتمدة وشاشة المديونيات الكبرى.',
    sentAt: '2026-11-25T09:42:00Z',
    readByUserIds: ['usr-001', 'usr-002'],
    replyToMessageId: 'msg-101',
    replyToPreview: 'السلام عليكم يا باشمهندس أحمد، تم مراجعة كشف المديونيات الكبرى...',
  },
  {
    id: 'msg-103',
    conversationId: 'conv-direct-1',
    senderId: 'usr-002',
    senderName: 'أ. خالد محمد الشناوي',
    senderRoleLabel: 'مدير إدارة تموين مركز المحلة الكبرى',
    text: 'تم أيضاً رفع تقرير حملة التفتيش في المهمة رقم TSK-2026-002 لاعتماد الإغلاق من جانبكم.',
    sentAt: '2026-11-25T10:15:00Z',
    readByUserIds: ['usr-002'],
  },
  {
    id: 'msg-201',
    conversationId: 'conv-dept-bak',
    senderId: 'usr-001',
    senderName: 'Eng. Ahmed El-Hosseiny',
    senderRoleLabel: 'مدير النظام الرئيسي',
    text: 'تنبيه هام لجميع مفتشي الرقابة ومسؤولي المديونيات: يرجى الالتزام بتسجيل رقم ماكينة POS والسند القانوني (قرار ١٧٥ لسنة ٢٠٢٤) في كافة محاضر نقص الوزن.',
    sentAt: '2026-11-25T09:45:00Z',
    readByUserIds: ['usr-001'],
  },
  {
    id: 'msg-301',
    conversationId: 'conv-task-001',
    senderId: 'usr-002',
    senderName: 'أ. خالد محمد الشناوي',
    senderRoleLabel: 'مدير إدارة تموين مركز المحلة الكبرى',
    text: 'تم إرفاق صورة إنذار السداد الموجه لمخبز البركة البلدي بقرية بشبيش داخل ملف المهمة.',
    sentAt: '2026-11-25T10:00:00Z',
    readByUserIds: ['usr-002'],
    attachmentName: 'إنذار_سداد_NOT-2026-409.pdf',
    attachmentType: 'كشف حساب',
  },
];

export const INITIAL_UNIFIED_NOTIFICATIONS: UnifiedSystemNotification[] = [
  {
    id: 'unot-1',
    recipientUserId: 'ALL',
    category: 'طلب اعتماد',
    title: 'مهمة تنتظر اعتماد الإغلاق (TSK-2026-002)',
    message: 'قدم أ. خالد محمد الشناوي تقرير الإنجاز النهائي لحملة تفتيش الهياتم وصفط تراب وبانتظار الاعتماد.',
    severity: 'info',
    isRead: false,
    createdAt: '2026-11-25T08:35:00Z',
    targetDeptId: 'd-25',
    targetRecordId: 'tsk-2026-002',
  },
  {
    id: 'unot-2',
    recipientUserId: 'ALL',
    category: 'تحديث مديونية',
    title: 'تجاوز حد المديونية الكبرى — مخبز البركة البلدي',
    message: 'صافي المديونية الحالية (٩,٠٠٠ ج.م) لمخبز البركة البلدي ببشبيش يتجاوز الحد المالي المعتمد مع وجود قسط متأخر.',
    severity: 'urgent',
    isRead: false,
    createdAt: '2026-11-25T09:00:00Z',
    targetDeptId: 'd-03',
    targetRecordId: 'debt-102',
  },
  {
    id: 'unot-3',
    recipientUserId: 'ALL',
    category: 'تأخر مهمة',
    title: 'تأخر موعد تنفيذ المهمة TSK-2026-003',
    message: 'مهمة مراجعة وتجديد تراخيص المخابز المنتهية تجاوزت الموعد النهائي المحدد (٢٠٢٦/١١/٢٣).',
    severity: 'warning',
    isRead: false,
    createdAt: '2026-11-25T09:10:00Z',
    targetDeptId: 'd-25',
    targetRecordId: 'tsk-2026-003',
  },
  {
    id: 'unot-4',
    recipientUserId: 'ALL',
    category: 'مخالفة جديدة',
    title: 'محضر مخالفات معتمد جاهز للترحيل (محضر-2026-152)',
    message: 'تم اعتماد محضر مخالفات مخبز الهدى والنور الآلي بدمرو بإجمالي ١,٠٠٠ ج.م وبانتظار الترحيل للمديونيات.',
    severity: 'warning',
    isRead: false,
    createdAt: '2026-11-25T09:20:00Z',
    targetDeptId: 'd-16',
    targetRecordId: 'ovr-2026-02',
  },
];

export function loadChatConversations(): InternalChatConversation[] {
  if (typeof window === 'undefined') return INITIAL_CHAT_CONVERSATIONS;
  try {
    const raw = localStorage.getItem(CHAT_CONVS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_CHAT_CONVERSATIONS;
  } catch {
    return INITIAL_CHAT_CONVERSATIONS;
  }
}

export function saveChatConversations(list: InternalChatConversation[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHAT_CONVS_STORAGE_KEY, JSON.stringify(list));
}

export function loadChatMessages(): InternalChatMessage[] {
  if (typeof window === 'undefined') return INITIAL_CHAT_MESSAGES;
  try {
    const raw = localStorage.getItem(CHAT_MSGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_CHAT_MESSAGES;
  } catch {
    return INITIAL_CHAT_MESSAGES;
  }
}

export function saveChatMessages(list: InternalChatMessage[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHAT_MSGS_STORAGE_KEY, JSON.stringify(list));
}

export function loadUnifiedNotifications(): UnifiedSystemNotification[] {
  if (typeof window === 'undefined') return INITIAL_UNIFIED_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(UNIFIED_NOTIFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_UNIFIED_NOTIFICATIONS;
  } catch {
    return INITIAL_UNIFIED_NOTIFICATIONS;
  }
}

export function saveUnifiedNotifications(list: UnifiedSystemNotification[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(UNIFIED_NOTIFS_STORAGE_KEY, JSON.stringify(list));
}

// ============================================================================
// ٧. مخطط وترحيل قاعدة بيانات Supabase الكامل (25 جدولاً + RLS + Transactions + Realtime)
// ============================================================================
export const SUPABASE_COMPLETE_MIGRATION_SQL = `-- ===================================================================================
-- منظومة مديرية التموين والتجارة الداخلية بالغربية — إدارة تموين مركز المحلة الكبرى
-- Designed & Developed by Eng. Ahmed El-Hosseiny — Tel: 01004414038
-- ترحيل قاعدة بيانات Supabase الموحد (المديونيات الكبرى + محاضر المخالفات + المهام + الشات الداخلي)
-- ===================================================================================

BEGIN;

-- أ) جداول المديونيات الكبرى وجدولة السداد (6 جداول)
CREATE TABLE IF NOT EXISTS public.bakery_debt_threshold_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_amount_egp NUMERIC(14,2) NOT NULL CHECK (threshold_amount_egp >= 0),
  warning_approach_percent NUMERIC(5,2) NOT NULL DEFAULT 80,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('all','branch','village','bakery')),
  scope_target_value TEXT NOT NULL,
  comparison_rule TEXT NOT NULL CHECK (comparison_rule IN ('gte','gt')),
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.bakery_major_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_number TEXT UNIQUE NOT NULL,
  bakery_id TEXT NOT NULL,
  bakery_number TEXT NOT NULL,
  bakery_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  supply_branch_name TEXT NOT NULL DEFAULT 'إدارة تموين مركز المحلة الكبرى',
  village TEXT NOT NULL,
  local_unit TEXT NOT NULL,
  phone TEXT,
  total_violations_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_additions_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_disposals_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_paid_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_current_debt_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'معتمد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bakery_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_number TEXT UNIQUE NOT NULL,
  debt_id UUID NOT NULL REFERENCES public.bakery_major_debts(id) ON DELETE RESTRICT,
  bakery_id TEXT NOT NULL,
  total_debt_egp NUMERIC(14,2) NOT NULL,
  down_payment_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_scheduled_egp NUMERIC(14,2) NOT NULL,
  frequency_type TEXT NOT NULL,
  installment_amount_egp NUMERIC(14,2) NOT NULL,
  installments_count INT NOT NULL CHECK (installments_count > 0),
  first_installment_date DATE NOT NULL,
  last_installment_date DATE NOT NULL,
  due_days_hint TEXT,
  responsible_employee TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'معتمد نشط',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bakery_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.bakery_payment_plans(id) ON DELETE RESTRICT,
  debt_id UUID NOT NULL REFERENCES public.bakery_major_debts(id) ON DELETE RESTRICT,
  installment_serial INT NOT NULL,
  due_date DATE NOT NULL,
  amount_due_egp NUMERIC(14,2) NOT NULL,
  amount_paid_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_amount_egp NUMERIC(14,2) NOT NULL,
  actual_paid_date DATE,
  payment_method TEXT,
  receipt_number TEXT,
  recorded_by_employee TEXT,
  status TEXT NOT NULL DEFAULT 'لم يستحق',
  UNIQUE(plan_id, installment_serial)
);

CREATE TABLE IF NOT EXISTS public.bakery_installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  debt_id UUID NOT NULL REFERENCES public.bakery_major_debts(id) ON DELETE RESTRICT,
  installment_id UUID REFERENCES public.bakery_installments(id) ON DELETE RESTRICT,
  receipt_number TEXT UNIQUE NOT NULL,
  payment_date DATE NOT NULL,
  amount_egp NUMERIC(14,2) NOT NULL CHECK (amount_egp > 0),
  payment_method TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  is_reversal BOOLEAN NOT NULL DEFAULT false,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bakery_debt_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id TEXT NOT NULL,
  debt_id UUID REFERENCES public.bakery_major_debts(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  assigned_employee TEXT,
  notify_before_days INT NOT NULL DEFAULT 3,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ب) جداول محاضر المخالفات والربط بالمديونيات (6 جداول)
CREATE TABLE IF NOT EXISTS public.bakery_violation_authorities (
  id TEXT PRIMARY KEY,
  authority_name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.bakery_violation_types (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  group_code TEXT NOT NULL,
  group_title TEXT NOT NULL,
  violation_title TEXT NOT NULL,
  default_unit TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.bakery_violation_legal_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type_id TEXT NOT NULL REFERENCES public.bakery_violation_types(id) ON DELETE RESTRICT,
  decree_number TEXT NOT NULL,
  legal_article TEXT NOT NULL,
  competent_authority TEXT NOT NULL,
  approved_penalty TEXT NOT NULL,
  default_base_fine_egp NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.bakery_violation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT UNIQUE NOT NULL,
  case_number TEXT,
  bakery_id TEXT NOT NULL,
  bakery_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  pos_number TEXT NOT NULL,
  issuing_authority_snapshot TEXT NOT NULL, -- يحفظ اسم الجهة وقت التحرير دون تأثر بالتعديلات اللاحقة
  sub_department_name TEXT,
  inspector_name TEXT NOT NULL,
  report_date DATE NOT NULL,
  report_location TEXT NOT NULL,
  report_status TEXT NOT NULL DEFAULT 'قيد المراجعة',
  payment_status TEXT NOT NULL DEFAULT 'غير مسدد',
  total_fine_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bakery_violation_report_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.bakery_violation_reports(id) ON DELETE CASCADE,
  violation_type_id TEXT NOT NULL,
  violation_title TEXT NOT NULL,
  detailed_description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  decree_article_ref TEXT NOT NULL,
  fine_amount_egp NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bakery_violation_debt_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID UNIQUE NOT NULL REFERENCES public.bakery_violation_reports(id) ON DELETE RESTRICT,
  report_number TEXT UNIQUE NOT NULL,
  debt_id UUID NOT NULL REFERENCES public.bakery_major_debts(id) ON DELETE RESTRICT,
  debt_number TEXT NOT NULL,
  transferred_amount_egp NUMERIC(14,2) NOT NULL,
  transferred_by TEXT NOT NULL,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ج) جداول إدارة المهام اليومية والمتابعة الشاملة (9 جداول)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  department_id TEXT NOT NULL,
  department_name TEXT NOT NULL,
  primary_assignee_id TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL,
  task_type TEXT NOT NULL,
  confidentiality TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'جديدة',
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  completion_report_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  role_in_task TEXT NOT NULL DEFAULT 'مشارك',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  updated_by TEXT NOT NULL,
  progress_percent INT NOT NULL,
  report_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('معتمد','معاد للمراجعة','مرفوض')),
  decided_by TEXT NOT NULL,
  decision_notes TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  action_title TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.department_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code TEXT NOT NULL,
  source_record_type TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- د) جداول الشات الداخلي المباشر بين الموظفين (6 جداول)
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  department_id TEXT,
  is_cross_department BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('direct','department_group','cross_department_group','task_chat')),
  department_id TEXT,
  linked_task_id UUID REFERENCES public.daily_tasks(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  reply_to_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_deleted_from_ui BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  attachment_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تفعيل سياسات أمن الصفوف (Row Level Security) على محادثات الشات والمهام والمديونيات
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bakery_major_debts ENABLE ROW LEVEL SECURITY;

COMMIT;
`;
