import { MAHALLA_LOCAL_UNITS, MAHALLA_VILLAGES, MAHALLA_VILLAGE_TO_LOCAL_UNIT } from './bakery-math';
import { normalizeSearchText } from './utils';

export interface ManagedLocalUnitItem {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ManagedVillageRecord {
  id: string;
  villageName: string;
  /** الحفاظ على التوافق التام مع السجلات القديمة — يمثل أول وحدة محلية نشطة */
  localUnitName: string;
  /** قائمة الوحدات المحلية التابعة للقرية (عدد غير محدود) */
  localUnits: ManagedLocalUnitItem[];
  supplyAdministration: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ManagedTableHeaderColumn {
  key: string;
  defaultLabel: string;
  customLabel: string;
}

export interface ManagedTableHeaderRegistry {
  tableId: string;
  sectionName: string;
  tableName: string;
  columns: ManagedTableHeaderColumn[];
}

export interface ManagedDropdownListGroup {
  id: string;
  groupKey: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  isSystem: boolean;
  sortOrder: number;
}

export interface ManagedDropdownCatalogItem {
  id: string;
  groupKey: string;
  label: string;
  parentItemId?: string | null;
  authorityOrMeta: string;
  defaultValidityMonths: number;
  defaultExpiryDate: string;
  isActive: boolean;
  sortOrder: number;
}

export interface MasterDocumentExpiryEntry {
  id: string;
  sectionLabel: string;
  entityCode: string;
  entityName: string;
  ownerName: string;
  village: string;
  localUnit: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  taxCardNumber: string;
  taxCardExpiryDate: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiryDate: string;
}

const KEYS = {
  villages: 'gharbia_master_dropdown_villages_v1',
  tableHeaders: 'gharbia_master_table_headers_v1',
  catalogs: 'gharbia_master_dropdown_catalogs_v1',
  catalogGroups: 'gharbia_master_dropdown_groups_v2',
  docExpiries: 'gharbia_master_doc_expiries_v1',
};

export const DROPDOWN_LISTS_UPDATED_EVENT = 'gharbia:dropdown-lists-updated';

function emitDropdownListsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DROPDOWN_LISTS_UPDATED_EVENT));
  }
}

export function subscribeDropdownLists(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(DROPDOWN_LISTS_UPDATED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(DROPDOWN_LISTS_UPDATED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

/**
 * القرى الافتراضية شاملة أمثلة المستخدم (بشبيش، محلة حسن، صفط تراب...) مع الوحدات المحلية المتعددة
 */
function buildInitialVillages(): ManagedVillageRecord[] {
  const baseNames = Array.from(new Set(['بشبيش', 'محلة حسن', 'صفط تراب', ...MAHALLA_VILLAGES]));
  return baseNames.map((v, idx) => {
    const primaryUnit =
      v === 'محلة حسن'
        ? 'الوحدة المحلية بمحلة حسن'
        : MAHALLA_VILLAGE_TO_LOCAL_UNIT[v] || MAHALLA_LOCAL_UNITS[0];

    const units: ManagedLocalUnitItem[] =
      v === 'بشبيش'
        ? [
            { id: `lu-${idx + 1}-1`, name: 'الوحدة المحلية ببشبيش', isActive: true, sortOrder: 1, createdAt: '2026-01-01' },
            { id: `lu-${idx + 1}-2`, name: 'الوحدة المحلية بشبشير / القطاع الشرقي', isActive: true, sortOrder: 2, createdAt: '2026-01-01' },
          ]
        : [
            { id: `lu-${idx + 1}-1`, name: primaryUnit, isActive: true, sortOrder: 1, createdAt: '2026-01-01' },
          ];

    return {
      id: `vil-${idx + 1}`,
      villageName: v,
      localUnitName: units[0].name,
      localUnits: units,
      supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
      isActive: true,
      sortOrder: idx + 1,
    };
  });
}

export const INITIAL_MANAGED_VILLAGES: ManagedVillageRecord[] = buildInitialVillages();

export const INITIAL_DROPDOWN_GROUPS: ManagedDropdownListGroup[] = [
  {
    id: 'grp-1',
    groupKey: 'governorates_centers',
    titleAr: 'المحافظات والمراكز والإدارات',
    titleEn: 'Governorates, Centers & Administrations',
    descriptionAr: 'التقسيم الإداري للمحافظات والمراكز والإدارات التموينية ومكاتب التموين',
    isSystem: true,
    sortOrder: 1,
  },
  {
    id: 'grp-2',
    groupKey: 'activity_types',
    titleAr: 'أنواع الأنشطة',
    titleEn: 'Activity Types',
    descriptionAr: 'تصنيفات الأنشطة التموينية والتجارية والغذائية والمخابز والمنافذ',
    isSystem: true,
    sortOrder: 2,
  },
  {
    id: 'grp-3',
    groupKey: 'license_types',
    titleAr: 'أنواع التراخيص',
    titleEn: 'License Types',
    descriptionAr: 'التراخيص الرسمية للمحال والمخابز والمستودعات ومحطات الوقود والمنافذ',
    isSystem: true,
    sortOrder: 3,
  },
  {
    id: 'grp-4',
    groupKey: 'commodity_categories',
    titleAr: 'أنواع السلع',
    titleEn: 'Commodity Types',
    descriptionAr: 'مجموعات وتصنيفات السلع التموينية والأساسية والحرة والمواد البترولية',
    isSystem: true,
    sortOrder: 4,
  },
  {
    id: 'grp-5',
    groupKey: 'violation_groups',
    titleAr: 'أنواع المخالفات',
    titleEn: 'Violation Types',
    descriptionAr: 'بنود المخالفات التموينية ونقص الوزن والأسعار والقرارات الوزارية',
    isSystem: true,
    sortOrder: 5,
  },
  {
    id: 'grp-6',
    groupKey: 'record_statuses',
    titleAr: 'حالات السجلات',
    titleEn: 'Record Statuses',
    descriptionAr: 'حالات التفعيل والتعليق والانتهاء والمراجعة القانونية عبر المنظومة',
    isSystem: true,
    sortOrder: 6,
  },
  {
    id: 'grp-7',
    groupKey: 'document_types',
    titleAr: 'أنواع المستندات',
    titleEn: 'Document Types',
    descriptionAr: 'البطاقة الضريبية، السجل التجاري، رخصة التشغيل، وعقود الإيجار والتمليك',
    isSystem: true,
    sortOrder: 7,
  },
  {
    id: 'grp-8',
    groupKey: 'entity_types',
    titleAr: 'أنواع الجهات',
    titleEn: 'Entity Types',
    descriptionAr: 'جهات التوريد والرقابة والإشراف والتراخيص والمجمعات والشركات القابضة',
    isSystem: true,
    sortOrder: 8,
  },
  {
    id: 'grp-9',
    groupKey: 'card_types',
    titleAr: 'أنواع البطاقات التموينية',
    titleEn: 'Ration Card Types',
    descriptionAr: 'تصنيفات البطاقات الذكية التموينية والخبز والأولى بالرعاية',
    isSystem: true,
    sortOrder: 9,
  },
  {
    id: 'grp-10',
    groupKey: 'outlet_types',
    titleAr: 'أنواع المنافذ التموينية',
    titleEn: 'Supply Outlet Types',
    descriptionAr: 'بقال تمويني، مشروع جمعيتي، مجمعات استهلاكية، ومنافذ صرف',
    isSystem: true,
    sortOrder: 10,
  },
];

export const INITIAL_MANAGED_TABLE_HEADERS: ManagedTableHeaderRegistry[] = [
  {
    tableId: 'bakery_registry',
    sectionName: 'منظومة الرقابة على المخابز',
    tableName: 'سجل المخابز البلدية المدعمة',
    columns: [
      { key: 'bakeryNumber', defaultLabel: 'رقم المخبز', customLabel: 'رقم المخبز' },
      { key: 'posNumber', defaultLabel: 'رقم ماكينة POS', customLabel: 'رقم ماكينة POS' },
      { key: 'name', defaultLabel: 'اسم المخبز', customLabel: 'اسم المخبز' },
      { key: 'ownerName', defaultLabel: 'صاحب المخبز', customLabel: 'صاحب المخبز' },
      { key: 'village', defaultLabel: 'القرية', customLabel: 'القرية' },
      { key: 'localUnit', defaultLabel: 'الوحدة المحلية', customLabel: 'الوحدة المحلية' },
      { key: 'licenseNumber', defaultLabel: 'رقم الترخيص', customLabel: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', defaultLabel: 'انتهاء الترخيص', customLabel: 'انتهاء الترخيص' },
      { key: 'taxCardNumber', defaultLabel: 'رقم البطاقة الضريبية', customLabel: 'رقم البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', defaultLabel: 'انتهاء البطاقة الضريبية', customLabel: 'انتهاء البطاقة الضريبية' },
      { key: 'commercialRegisterNumber', defaultLabel: 'رقم السجل التجاري', customLabel: 'رقم السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', defaultLabel: 'انتهاء السجل التجاري', customLabel: 'انتهاء السجل التجاري' },
    ],
  },
  {
    tableId: 'trade_establishments',
    sectionName: 'قسم التجارة الداخلية',
    tableName: 'سجل المحلات والمنشآت التجارية',
    columns: [
      { key: 'autoCode', defaultLabel: 'كود المنشأة', customLabel: 'كود المنشأة' },
      { key: 'name', defaultLabel: 'اسم المحل / المنشأة', customLabel: 'اسم المحل / المنشأة' },
      { key: 'ownerName', defaultLabel: 'اسم التاجر', customLabel: 'اسم التاجر' },
      { key: 'village', defaultLabel: 'القرية', customLabel: 'القرية' },
      { key: 'taxCardNumber', defaultLabel: 'البطاقة الضريبية', customLabel: 'البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', defaultLabel: 'انتهاء الضريبية', customLabel: 'انتهاء الضريبية' },
      { key: 'commercialRegisterNumber', defaultLabel: 'السجل التجاري', customLabel: 'السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', defaultLabel: 'انتهاء السجل', customLabel: 'انتهاء السجل' },
      { key: 'licenseNumber', defaultLabel: 'رقم الترخيص', customLabel: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', defaultLabel: 'انتهاء الترخيص', customLabel: 'انتهاء الترخيص' },
    ],
  },
  {
    tableId: 'trade_warehouses_and_fuel',
    sectionName: 'قسم التجارة الداخلية',
    tableName: 'سجل مستودعات البوتاجاز ومحطات الوقود والموزعين',
    columns: [
      { key: 'code', defaultLabel: 'الكود', customLabel: 'الكود' },
      { key: 'entityName', defaultLabel: 'اسم المستودع / المحطة / الموزع', customLabel: 'اسم المستودع / المحطة / الموزع' },
      { key: 'ownerName', defaultLabel: 'اسم المالك / التاجر', customLabel: 'اسم المالك / التاجر' },
      { key: 'village', defaultLabel: 'القرية', customLabel: 'القرية' },
      { key: 'licenseNumber', defaultLabel: 'رقم الترخيص', customLabel: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', defaultLabel: 'انتهاء الترخيص', customLabel: 'انتهاء الترخيص' },
      { key: 'taxCardNumber', defaultLabel: 'البطاقة الضريبية', customLabel: 'البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', defaultLabel: 'انتهاء البطاقة الضريبية', customLabel: 'انتهاء البطاقة الضريبية' },
      { key: 'commercialRegisterNumber', defaultLabel: 'السجل التجاري', customLabel: 'السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', defaultLabel: 'انتهاء السجل التجاري', customLabel: 'انتهاء السجل التجاري' },
    ],
  },
  {
    tableId: 'ration_commodities',
    sectionName: 'قسم السلع التموينية',
    tableName: 'سجل السلع التموينية والتجار والحصص والمخازن',
    columns: [
      { key: 'commodityCode', defaultLabel: 'كود السلعة', customLabel: 'كود السلعة' },
      { key: 'commodityName', defaultLabel: 'اسم السلعة', customLabel: 'اسم السلعة' },
      { key: 'merchantName', defaultLabel: 'التاجر التمويني', customLabel: 'التاجر التمويني' },
      { key: 'village', defaultLabel: 'القرية', customLabel: 'القرية' },
      { key: 'licenseNumber', defaultLabel: 'رقم الترخيص', customLabel: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', defaultLabel: 'انتهاء الترخيص', customLabel: 'انتهاء الترخيص' },
      { key: 'taxCardNumber', defaultLabel: 'رقم البطاقة الضريبية', customLabel: 'رقم البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', defaultLabel: 'انتهاء البطاقة الضريبية', customLabel: 'انتهاء البطاقة الضريبية' },
      { key: 'commercialRegisterNumber', defaultLabel: 'رقم السجل التجاري', customLabel: 'رقم السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', defaultLabel: 'انتهاء السجل التجاري', customLabel: 'انتهاء السجل التجاري' },
    ],
  },
  {
    tableId: 'debts_and_violations',
    sectionName: 'المديونيات والرقابة والتفتيش',
    tableName: 'جداول المديونيات والمخالفات والشكاوى',
    columns: [
      { key: 'posNumber', defaultLabel: 'رقم ماكينة POS', customLabel: 'رقم ماكينة POS' },
      { key: 'ownerName', defaultLabel: 'اسم صاحب المخبز / التاجر', customLabel: 'اسم صاحب المخبز / التاجر' },
      { key: 'dueAmount', defaultLabel: 'المبلغ المستحق', customLabel: 'المبلغ المستحق' },
      { key: 'paidAmount', defaultLabel: 'المبلغ المسدد', customLabel: 'المبلغ المسدد' },
      { key: 'remainingAmount', defaultLabel: 'المتبقي', customLabel: 'المتبقي' },
      { key: 'actions', defaultLabel: 'الإجراءات', customLabel: 'الإجراءات' },
    ],
  },
];

export const INITIAL_DROPDOWN_CATALOGS: ManagedDropdownCatalogItem[] = [
  // المحافظات والمراكز والإدارات
  { id: 'cat-gov-1', groupKey: 'governorates_centers', label: 'محافظة الغربية', parentItemId: null, authorityOrMeta: 'مديرية التموين والتجارة الداخلية بالغربية', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 1 },
  { id: 'cat-gov-2', groupKey: 'governorates_centers', label: 'إدارة تموين مركز المحلة الكبرى', parentItemId: 'cat-gov-1', authorityOrMeta: 'القطاع الشمالي للمحافظة', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 2 },
  { id: 'cat-gov-3', groupKey: 'governorates_centers', label: 'إدارة تموين بندر المحلة الكبرى', parentItemId: 'cat-gov-1', authorityOrMeta: 'مدينة المحلة الكبرى', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 3 },
  { id: 'cat-gov-4', groupKey: 'governorates_centers', label: 'إدارة تموين أول وثان طنطا', parentItemId: 'cat-gov-1', authorityOrMeta: 'ديوان عام المحافظة', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 4 },
  // أنواع الأنشطة
  { id: 'cat-act-1', groupKey: 'activity_types', label: 'مخبز بلدي مدعم', parentItemId: null, authorityOrMeta: 'منظومة الخبز المدعم', defaultValidityMonths: 36, defaultExpiryDate: '2029-11-25', isActive: true, sortOrder: 1 },
  { id: 'cat-act-2', groupKey: 'activity_types', label: 'سوبر ماركت ومواد غذائية', parentItemId: null, authorityOrMeta: 'قسم التجارة الداخلية', defaultValidityMonths: 24, defaultExpiryDate: '2028-11-25', isActive: true, sortOrder: 2 },
  { id: 'cat-act-3', groupKey: 'activity_types', label: 'مستودع بوتاجاز وتوزيع أسطوانات', parentItemId: null, authorityOrMeta: 'المواد البترولية والغاز', defaultValidityMonths: 24, defaultExpiryDate: '2028-06-30', isActive: true, sortOrder: 3 },
  { id: 'cat-act-4', groupKey: 'activity_types', label: 'محطة تموين وخدمة سيارات', parentItemId: null, authorityOrMeta: 'الهيئة المصرية العامة للبترول', defaultValidityMonths: 36, defaultExpiryDate: '2029-06-30', isActive: true, sortOrder: 4 },
  // أنواع التراخيص
  { id: 'cat-1', groupKey: 'license_types', label: 'ترخيص تشغيل محل تجاري / بقال تمويني', parentItemId: null, authorityOrMeta: 'مركز إصدار التراخيص بالوحدة المحلية', defaultValidityMonths: 24, defaultExpiryDate: '2028-11-25', isActive: true, sortOrder: 1 },
  { id: 'cat-2', groupKey: 'license_types', label: 'ترخيص مخبز بلدي مدعم', parentItemId: null, authorityOrMeta: 'مديرية التموين والهيئة العامة للسلع التموينية', defaultValidityMonths: 36, defaultExpiryDate: '2029-11-25', isActive: true, sortOrder: 2 },
  { id: 'cat-3', groupKey: 'license_types', label: 'ترخيص مستودع بوتاجاز', parentItemId: null, authorityOrMeta: 'مديرية التموين وهيئة البترول والدفاع المدني', defaultValidityMonths: 24, defaultExpiryDate: '2028-06-30', isActive: true, sortOrder: 3 },
  { id: 'cat-4', groupKey: 'license_types', label: 'ترخيص محطة وقود ومواد بترولية', parentItemId: null, authorityOrMeta: 'الهيئة المصرية العامة للبترول ومديرية التموين', defaultValidityMonths: 36, defaultExpiryDate: '2029-06-30', isActive: true, sortOrder: 4 },
  // أنواع السلع
  { id: 'cat-8', groupKey: 'commodity_categories', label: 'السكر التمويني', parentItemId: null, authorityOrMeta: 'الشركة القابضة للصناعات الغذائية', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25', isActive: true, sortOrder: 1 },
  { id: 'cat-9', groupKey: 'commodity_categories', label: 'الزيت التمويني الخليط', parentItemId: null, authorityOrMeta: 'الشركة القابضة للصناعات الغذائية', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25', isActive: true, sortOrder: 2 },
  { id: 'cat-10', groupKey: 'commodity_categories', label: 'الأرز والمكرونة والدقيق المعبأ', parentItemId: null, authorityOrMeta: 'الشركة العامة لتجارة الجملة', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25', isActive: true, sortOrder: 3 },
  // أنواع المخالفات
  { id: 'cat-15', groupKey: 'violation_groups', label: 'نقص وزن رغيف الخبز البلدي (القرار ١٧٥ لسنة ٢٠٢٤)', parentItemId: null, authorityOrMeta: 'قرار وزير التموين ١٧٥ لسنة ٢٠٢٤', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25', isActive: true, sortOrder: 1 },
  { id: 'cat-16', groupKey: 'violation_groups', label: 'مخالفات الأسعار والإعلان والفواتير', parentItemId: null, authorityOrMeta: 'القانون ١٨١ لسنة ٢٠١٨ والقرار ٣٣٠', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25', isActive: true, sortOrder: 2 },
  { id: 'cat-17', groupKey: 'violation_groups', label: 'البيع بأزيد من السعر الرسمي أو التصرف في الحصة', parentItemId: null, authorityOrMeta: 'المرسوم بقانون ٩٥ لسنة ١٩٤٥', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25', isActive: true, sortOrder: 3 },
  // حالات السجلات
  { id: 'cat-st-1', groupKey: 'record_statuses', label: 'نشط ومعتمد', parentItemId: null, authorityOrMeta: 'حالة تشغيلية قياسية', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 1 },
  { id: 'cat-st-2', groupKey: 'record_statuses', label: 'موقوف مؤقتاً', parentItemId: null, authorityOrMeta: 'إيقاف إداري لحين الاستيفاء', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 2 },
  { id: 'cat-st-3', groupKey: 'record_statuses', label: 'تحت المراجعة القانونية', parentItemId: null, authorityOrMeta: 'فحص الشؤون القانونية', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 3 },
  { id: 'cat-st-4', groupKey: 'record_statuses', label: 'منتهي الصلاحية / الترخيص', parentItemId: null, authorityOrMeta: 'يستوجب التجديد الفوري', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 4 },
  // أنواع المستندات
  { id: 'cat-doc-1', groupKey: 'document_types', label: 'رخصة تشغيل رسمية', parentItemId: null, authorityOrMeta: 'إلزامي بجميع الأقسام', defaultValidityMonths: 24, defaultExpiryDate: '2028-11-25', isActive: true, sortOrder: 1 },
  { id: 'cat-doc-2', groupKey: 'document_types', label: 'البطاقة الضريبية', parentItemId: null, authorityOrMeta: 'مصلحة الضرائب المصرية', defaultValidityMonths: 60, defaultExpiryDate: '2030-11-25', isActive: true, sortOrder: 2 },
  { id: 'cat-doc-3', groupKey: 'document_types', label: 'السجل التجاري', parentItemId: null, authorityOrMeta: 'جهاز تنمية التجارة الداخلية', defaultValidityMonths: 60, defaultExpiryDate: '2030-11-25', isActive: true, sortOrder: 3 },
  // أنواع الجهات
  { id: 'cat-ent-1', groupKey: 'entity_types', label: 'الشركة العامة لتجارة الجملة', parentItemId: null, authorityOrMeta: 'جهة توريد رسمية', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 1 },
  { id: 'cat-ent-2', groupKey: 'entity_types', label: 'الهيئة العامة للسلع التموينية (GASC)', parentItemId: null, authorityOrMeta: 'وزارة التموين والتجارة الداخلية', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 2 },
  { id: 'cat-ent-3', groupKey: 'entity_types', label: 'مباحث التموين والرقابة التجارية', parentItemId: null, authorityOrMeta: 'جهة ضبط قضائي', defaultValidityMonths: 0, defaultExpiryDate: '', isActive: true, sortOrder: 3 },
  // أنواع البطاقات التموينية
  { id: 'cat-5', groupKey: 'card_types', label: 'بطاقة تموينية عادية (سلع + خبز)', parentItemId: null, authorityOrMeta: 'وزارة التموين والتجارة الداخلية', defaultValidityMonths: 60, defaultExpiryDate: '2030-12-31', isActive: true, sortOrder: 1 },
  { id: 'cat-6', groupKey: 'card_types', label: 'بطاقة تموينية تكافل وكرامة / أولى بالرعاية', parentItemId: null, authorityOrMeta: 'وزارة التموين والتضامن الاجتماعي', defaultValidityMonths: 36, defaultExpiryDate: '2029-12-31', isActive: true, sortOrder: 2 },
  { id: 'cat-7', groupKey: 'card_types', label: 'بطاقة صرف خبز فقط', parentItemId: null, authorityOrMeta: 'مديرية التموين بالغربية', defaultValidityMonths: 60, defaultExpiryDate: '2030-12-31', isActive: true, sortOrder: 3 },
  // أنواع المنافذ التموينية
  { id: 'cat-11', groupKey: 'outlet_types', label: 'بقال تمويني معتمد', parentItemId: null, authorityOrMeta: 'إدارة تموين مركز المحلة الكبرى', defaultValidityMonths: 24, defaultExpiryDate: '2028-11-25', isActive: true, sortOrder: 1 },
  { id: 'cat-12', groupKey: 'outlet_types', label: 'منفذ مشروع جمعيتي', parentItemId: null, authorityOrMeta: 'مشروع جمعيتي - وزارة التموين', defaultValidityMonths: 24, defaultExpiryDate: '2028-11-25', isActive: true, sortOrder: 2 },
  { id: 'cat-13', groupKey: 'outlet_types', label: 'مجمع استهلاكي حكومي', parentItemId: null, authorityOrMeta: 'الشركة العامة لتجارة الجملة', defaultValidityMonths: 36, defaultExpiryDate: '2029-11-25', isActive: true, sortOrder: 3 },
];

export const INITIAL_DOC_EXPIRY_ENTRIES: MasterDocumentExpiryEntry[] = [
  {
    id: 'mde-1',
    sectionLabel: 'المخابز البلدية',
    entityCode: 'BAK-1042',
    entityName: 'مخبز الفتح الآلي المطور',
    ownerName: 'محمد عبد الله إبراهيم',
    village: 'صفط تراب',
    localUnit: 'الوحدة المحلية بصفط تراب',
    licenseNumber: 'LIC-GH-1042',
    licenseExpiryDate: '2027-08-15',
    taxCardNumber: '412-885-102',
    taxCardExpiryDate: '2028-04-30',
    commercialRegisterNumber: 'CR-77410',
    commercialRegisterExpiryDate: '2028-12-31',
  },
  {
    id: 'mde-2',
    sectionLabel: 'التجارة الداخلية',
    entityCode: 'EST-2026-0001',
    entityName: 'أسواق السلام الغذائية الكبرى',
    ownerName: 'أحمد السيد عبد الرحمن',
    village: 'محلة أبو علي',
    localUnit: 'الوحدة المحلية بمحلة أبو علي',
    licenseNumber: 'TRD-LIC-2026-001',
    licenseExpiryDate: '2027-05-20',
    taxCardNumber: '519-302-441',
    taxCardExpiryDate: '2028-03-15',
    commercialRegisterNumber: 'CR-99104',
    commercialRegisterExpiryDate: '2027-12-01',
  },
  {
    id: 'mde-3',
    sectionLabel: 'السلع التموينية',
    entityCode: 'MER-2026-001',
    entityName: 'منفذ النور للسلع التموينية (جمعيتي)',
    ownerName: 'محمود إبراهيم الششتاوي',
    village: 'الهياتم',
    localUnit: 'الوحدة المحلية بالهياتم',
    licenseNumber: 'RAT-LIC-8801',
    licenseExpiryDate: '2027-02-15',
    taxCardNumber: '601-442-819',
    taxCardExpiryDate: '2027-09-10',
    commercialRegisterNumber: 'CR-88512',
    commercialRegisterExpiryDate: '2028-01-20',
  },
  {
    id: 'mde-4',
    sectionLabel: 'البوتاجاز والوقود',
    entityCode: 'WH-BUT-01',
    entityName: 'مستودع بوتاجاز المحلة الرئيسي',
    ownerName: 'الحاج سعيد عبد الفتاح',
    village: 'دمرو',
    localUnit: 'الوحدة المحلية بدمرو',
    licenseNumber: 'GAS-LIC-401',
    licenseExpiryDate: '2026-12-20',
    taxCardNumber: '311-904-552',
    taxCardExpiryDate: '2027-06-30',
    commercialRegisterNumber: 'CR-44190',
    commercialRegisterExpiryDate: '2027-11-15',
  },
];

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

function safeSave<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    emitDropdownListsUpdated();
  } catch {
    // ignore storage errors
  }
}

/** ترقية تلقائية لأي سجلات قرى قديمة لم تكن تحتوي على مصفوفة localUnits */
function hydrateVillageRecord(v: Partial<ManagedVillageRecord>, idx: number): ManagedVillageRecord {
  const existingUnits = Array.isArray(v.localUnits)
    ? v.localUnits.map((u, uIdx) => ({
        id: u.id || `lu-${idx + 1}-${uIdx + 1}`,
        name: u.name || '',
        isActive: u.isActive !== false,
        sortOrder: u.sortOrder ?? uIdx + 1,
        createdAt: u.createdAt || '2026-01-01',
      }))
    : v.localUnitName
    ? [
        {
          id: `lu-${idx + 1}-1`,
          name: v.localUnitName,
          isActive: true,
          sortOrder: 1,
          createdAt: '2026-01-01',
        },
      ]
    : [];

  const firstActiveUnit = existingUnits.find((u) => u.isActive)?.name || existingUnits[0]?.name || v.localUnitName || '';
  return {
    id: v.id || `vil-${idx + 1}`,
    villageName: v.villageName || '',
    localUnitName: firstActiveUnit,
    localUnits: existingUnits,
    supplyAdministration: v.supplyAdministration || 'إدارة تموين مركز المحلة الكبرى',
    isActive: v.isActive !== false,
    sortOrder: v.sortOrder ?? idx + 1,
  };
}

export function loadManagedVillages(): ManagedVillageRecord[] {
  const raw = safeLoad<Partial<ManagedVillageRecord>[]>(KEYS.villages, INITIAL_MANAGED_VILLAGES);
  return raw.map((v, idx) => hydrateVillageRecord(v, idx));
}

export function saveManagedVillages(list: ManagedVillageRecord[]): void {
  const normalized = list.map((v, idx) => hydrateVillageRecord(v, idx));
  safeSave(KEYS.villages, normalized);
}

export function loadManagedDropdownGroups(): ManagedDropdownListGroup[] {
  const saved = safeLoad<ManagedDropdownListGroup[]>(KEYS.catalogGroups, INITIAL_DROPDOWN_GROUPS);
  // دمج المجموعات الأساسية الجديدة إذا لم تكن محفوظة من قبل
  const existingKeys = new Set(saved.map((g) => g.groupKey));
  const merged = [...saved];
  INITIAL_DROPDOWN_GROUPS.forEach((g) => {
    if (!existingKeys.has(g.groupKey)) merged.push(g);
  });
  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function saveManagedDropdownGroups(list: ManagedDropdownListGroup[]): void {
  safeSave(KEYS.catalogGroups, list);
}

export function loadManagedCatalogs(): ManagedDropdownCatalogItem[] {
  const raw = safeLoad<Partial<ManagedDropdownCatalogItem>[]>(KEYS.catalogs, INITIAL_DROPDOWN_CATALOGS);
  return raw.map((item, idx) => ({
    id: item.id || `cat-${idx + 1}`,
    groupKey: item.groupKey === 'establishment_categories' ? 'activity_types' : item.groupKey || 'activity_types',
    label: item.label || '',
    parentItemId: item.parentItemId ?? null,
    authorityOrMeta: item.authorityOrMeta || '',
    defaultValidityMonths: Number(item.defaultValidityMonths) || 0,
    defaultExpiryDate: item.defaultExpiryDate || '',
    isActive: item.isActive !== false,
    sortOrder: item.sortOrder ?? idx + 1,
  }));
}

export function saveManagedCatalogs(list: ManagedDropdownCatalogItem[]): void {
  safeSave(KEYS.catalogs, list);
}

export function loadManagedTableHeaders(): ManagedTableHeaderRegistry[] {
  return safeLoad(KEYS.tableHeaders, INITIAL_MANAGED_TABLE_HEADERS);
}

export function saveManagedTableHeaders(list: ManagedTableHeaderRegistry[]): void {
  safeSave(KEYS.tableHeaders, list);
}

export function loadMasterDocExpiries(): MasterDocumentExpiryEntry[] {
  return safeLoad(KEYS.docExpiries, INITIAL_DOC_EXPIRY_ENTRIES);
}

export function saveMasterDocExpiries(list: MasterDocumentExpiryEntry[]): void {
  safeSave(KEYS.docExpiries, list);
}

// ==================== دوال الترابط الذكي التلقائي عبر كافة الأقسام ====================

/** القرى المفعّلة فقط للاستخدام في النماذج والإضافات الجديدة */
export function getActiveVillages(): ManagedVillageRecord[] {
  return loadManagedVillages()
    .filter((v) => v.isActive && v.villageName.trim() !== '')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveVillageNames(): string[] {
  const list = getActiveVillages().map((v) => v.villageName);
  return list.length > 0 ? list : [];
}

/** الوحدات المحلية التابعة لقرية محددة فقط (المفعّلة فقط) */
export function getActiveLocalUnitsForVillage(villageName: string): string[] {
  if (!villageName) return [];
  const norm = normalizeSearchText(villageName);
  const found = loadManagedVillages().find(
    (v) => normalizeSearchText(v.villageName) === norm
  );
  if (!found) return [];
  return found.localUnits
    .filter((u) => u.isActive && u.name.trim() !== '')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((u) => u.name);
}

/** جميع الوحدات المحلية المفعّلة (للفلاتر العامة فقط عند عدم اختيار قرية) */
export function getAllActiveLocalUnitNames(): string[] {
  const set = new Set<string>();
  getActiveVillages().forEach((v) => {
    v.localUnits
      .filter((u) => u.isActive && u.name.trim() !== '')
      .forEach((u) => set.add(u.name));
  });
  return Array.from(set);
}

/** عناصر قائمة منسدلة محددة (المفعّلة فقط ومرتبة حسب الترتيب المحفوظ) */
export function getActiveDropdownLabels(groupKey: string): string[] {
  return loadManagedCatalogs()
    .filter((c) => c.groupKey === groupKey && c.isActive && c.label.trim() !== '')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => c.label);
}

/** فحص منع التكرار داخل نفس القائمة (تجاهل المسافات والتشكيل والهمزات) */
export function isDuplicateLabel(existingLabels: string[], candidate: string): boolean {
  const target = normalizeSearchText(candidate);
  if (!target) return false;
  return existingLabels.some((lbl) => normalizeSearchText(lbl) === target);
}

/**
 * فحص عدد السجلات المرتبطة فعلياً بأي قرية أو وحدة محلية أو عنصر قائمة منسدلة عبر جميع أقسام المنظومة
 * لمنع الحذف المؤدي لفقد البيانات وإرشاد المستخدم لخيار «تعطيل» بدلاً من الحذف
 */
export function countSystemReferencesForValue(
  value: string,
  kind: 'village' | 'localUnit' | 'catalogItem'
): { total: number; breakdown: string[] } {
  if (typeof window === 'undefined' || !value.trim()) {
    return { total: 0, breakdown: [] };
  }
  const norm = normalizeSearchText(value);
  const breakdown: string[] = [];
  let total = 0;

  const scanStorageArray = (storageKey: string, labelAr: string, fields: string[]) => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      const count = arr.filter((row: Record<string, unknown>) =>
        fields.some((f) => typeof row?.[f] === 'string' && normalizeSearchText(String(row[f])) === norm)
      ).length;
      if (count > 0) {
        total += count;
        breakdown.push(`${labelAr}: ${count}`);
      }
    } catch {
      // ignore parse errors
    }
  };

  if (kind === 'village') {
    scanStorageArray('gharbia_supply_bakeries_v1', 'المخابز البلدية', ['village']);
    scanStorageArray('gharbia_trade_establishments_v1', 'منشآت التجارة الداخلية', ['village']);
    scanStorageArray('gharbia_trade_butane_v1', 'مستودعات البوتاجاز', ['village']);
    scanStorageArray('gharbia_trade_fuel_v1', 'محطات الوقود', ['village']);
    scanStorageArray('gharbia_ration_merchants_v1', 'التجار التموينيون', ['village']);
    scanStorageArray('gharbia_ration_quotas_v1', 'الحصص التموينية', ['village']);
    scanStorageArray(KEYS.docExpiries, 'سجل التراخيص والبطاقات', ['village']);
  } else if (kind === 'localUnit') {
    scanStorageArray('gharbia_supply_bakeries_v1', 'المخابز البلدية', ['localUnit']);
    scanStorageArray('gharbia_trade_establishments_v1', 'منشآت التجارة الداخلية', ['localUnit']);
    scanStorageArray('gharbia_ration_merchants_v1', 'التجار التموينيون', ['localUnit']);
    scanStorageArray('gharbia_ration_quotas_v1', 'الحصص التموينية', ['localUnit']);
    scanStorageArray(KEYS.docExpiries, 'سجل التراخيص والبطاقات', ['localUnit']);
  } else {
    scanStorageArray('gharbia_supply_bakeries_v1', 'المخابز البلدية', ['activityStatus', 'bakeryCategory', 'breadType']);
    scanStorageArray('gharbia_trade_establishments_v1', 'منشآت التجارة الداخلية', ['category', 'status', 'activityType']);
    scanStorageArray('gharbia_ration_commodities_v1', 'السلع التموينية', ['category', 'status']);
    scanStorageArray('gharbia_ration_merchants_v1', 'التجار التموينيون', ['outletType', 'status']);
  }

  return { total, breakdown };
}

export function getDropdownListsTableSummary(includeCustomGroups = false): { tableName: string; count: number }[] {
  const villages = loadManagedVillages();
  const totalUnits = villages.reduce((sum, v) => sum + v.localUnits.length, 0);
  const catalogs = loadManagedCatalogs();
  const docs = loadMasterDocExpiries();
  const customGroups = loadManagedDropdownGroups().filter((g) => !g.isSystem);
  const rows = [
    { tableName: 'جدول القرى والشياخات', count: villages.length },
    { tableName: 'جدول الوحدات المحلية التابعة للقرى', count: totalUnits },
    { tableName: 'عناصر القوائم المنسدلة (جميع المجموعات)', count: catalogs.length },
    { tableName: 'سجل التراخيص والبطاقات الضريبية والسجلات التجارية', count: docs.length },
  ];
  if (includeCustomGroups) {
    rows.push({ tableName: 'القوائم المنسدلة المخصصة المنشأة يدوياً', count: customGroups.length });
  }
  return rows;
}

export function captureDropdownListsSnapshot(): Record<string, unknown> {
  return {
    villages: loadManagedVillages(),
    catalogs: loadManagedCatalogs(),
    catalogGroups: loadManagedDropdownGroups(),
    docExpiries: loadMasterDocExpiries(),
    tableHeaders: loadManagedTableHeaders(),
  };
}

export function restoreDropdownListsSnapshot(snapshot: Record<string, unknown>): void {
  if (Array.isArray(snapshot.villages)) saveManagedVillages(snapshot.villages as ManagedVillageRecord[]);
  if (Array.isArray(snapshot.catalogs)) saveManagedCatalogs(snapshot.catalogs as ManagedDropdownCatalogItem[]);
  if (Array.isArray(snapshot.catalogGroups)) saveManagedDropdownGroups(snapshot.catalogGroups as ManagedDropdownListGroup[]);
  if (Array.isArray(snapshot.docExpiries)) saveMasterDocExpiries(snapshot.docExpiries as MasterDocumentExpiryEntry[]);
  if (Array.isArray(snapshot.tableHeaders)) saveManagedTableHeaders(snapshot.tableHeaders as ManagedTableHeaderRegistry[]);
}

export function factoryResetDropdownListsStore(clearCustomLists = true): void {
  saveManagedVillages([]);
  saveManagedCatalogs([]);
  saveMasterDocExpiries([]);
  saveManagedTableHeaders(INITIAL_MANAGED_TABLE_HEADERS);
  if (clearCustomLists) {
    saveManagedDropdownGroups(INITIAL_DROPDOWN_GROUPS);
  }
}
