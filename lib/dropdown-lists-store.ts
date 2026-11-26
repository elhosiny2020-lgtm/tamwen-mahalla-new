import { MAHALLA_LOCAL_UNITS, MAHALLA_VILLAGES, MAHALLA_VILLAGE_TO_LOCAL_UNIT } from './bakery-math';

export interface ManagedVillageRecord {
  id: string;
  villageName: string;
  localUnitName: string;
  supplyAdministration: string;
  isActive: boolean;
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

export interface ManagedDropdownCatalogItem {
  id: string;
  groupKey:
    | 'license_types'
    | 'card_types'
    | 'commodity_categories'
    | 'outlet_types'
    | 'establishment_categories'
    | 'violation_groups';
  label: string;
  authorityOrMeta: string;
  defaultValidityMonths: number;
  defaultExpiryDate: string;
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
  docExpiries: 'gharbia_master_doc_expiries_v1',
};

export const INITIAL_MANAGED_VILLAGES: ManagedVillageRecord[] = MAHALLA_VILLAGES.map((v, idx) => ({
  id: `vil-${idx + 1}`,
  villageName: v,
  localUnitName: MAHALLA_VILLAGE_TO_LOCAL_UNIT[v] || MAHALLA_LOCAL_UNITS[0],
  supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
  isActive: true,
}));

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
  { id: 'cat-1', groupKey: 'license_types', label: 'ترخيص تشغيل محل تجاري / بقال تمويني', authorityOrMeta: 'مركز إصدار التراخيص بالوحدة المحلية', defaultValidityMonths: 24, defaultExpiryDate: '2028-11-25' },
  { id: 'cat-2', groupKey: 'license_types', label: 'ترخيص مخبز بلدي مدعم', authorityOrMeta: 'مديرية التموين والهيئة العامة للسلع التموينية', defaultValidityMonths: 36, defaultExpiryDate: '2029-11-25' },
  { id: 'cat-3', groupKey: 'license_types', label: 'ترخيص مستودع بوتاجاز', authorityOrMeta: 'مديرية التموين وهيئة البترول والدفاع المدني', defaultValidityMonths: 24, defaultExpiryDate: '2028-06-30' },
  { id: 'cat-4', groupKey: 'license_types', label: 'ترخيص محطة وقود ومواد بترولية', authorityOrMeta: 'الهيئة المصرية العامة للبترول ومديرية التموين', defaultValidityMonths: 36, defaultExpiryDate: '2029-06-30' },
  { id: 'cat-5', groupKey: 'card_types', label: 'بطاقة تموينية عادية (سلع + خبز)', authorityOrMeta: 'وزارة التموين والتجارة الداخلية', defaultValidityMonths: 60, defaultExpiryDate: '2030-12-31' },
  { id: 'cat-6', groupKey: 'card_types', label: 'بطاقة تموينية تكافل وكرامة / أولى بالرعاية', authorityOrMeta: 'وزارة التموين والتضامن الاجتماعي', defaultValidityMonths: 36, defaultExpiryDate: '2029-12-31' },
  { id: 'cat-7', groupKey: 'card_types', label: 'بطاقة صرف خبز فقط', authorityOrMeta: 'مديرية التموين بالغربية', defaultValidityMonths: 60, defaultExpiryDate: '2030-12-31' },
  { id: 'cat-8', groupKey: 'commodity_categories', label: 'السكر التمويني', authorityOrMeta: 'الشركة القابضة للصناعات الغذائية', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25' },
  { id: 'cat-9', groupKey: 'commodity_categories', label: 'الزيت التمويني', authorityOrMeta: 'الشركة القابضة للصناعات الغذائية', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25' },
  { id: 'cat-10', groupKey: 'commodity_categories', label: 'الأرز والمكرونة والدقيق', authorityOrMeta: 'شركة العامة لتجارة الجملة', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25' },
  { id: 'cat-11', groupKey: 'outlet_types', label: 'بقال تمويني معتمد', authorityOrMeta: 'إدارة تموين مركز المحلة الكبرى', defaultValidityMonths: 24, defaultExpiryDate: '2028-11-25' },
  { id: 'cat-12', groupKey: 'outlet_types', label: 'منفذ مشروع جمعيتي', authorityOrMeta: 'مشروع جمعيتي - وزارة التموين', defaultValidityMonths: 24, defaultExpiryDate: '2028-11-25' },
  { id: 'cat-13', groupKey: 'outlet_types', label: 'مجمع استهلاكي حكومي', authorityOrMeta: 'الشركة العامة لتجارة الجملة', defaultValidityMonths: 36, defaultExpiryDate: '2029-11-25' },
  { id: 'cat-14', groupKey: 'establishment_categories', label: 'سوبر ماركت ومواد غذائية', authorityOrMeta: 'قسم التجارة الداخلية', defaultValidityMonths: 24, defaultExpiryDate: '2028-11-25' },
  { id: 'cat-15', groupKey: 'violation_groups', label: 'مخالفات الأسعار والإعلان والفواتير', authorityOrMeta: 'القانون ١٨١ لسنة ٢٠١٨ والقرار ٣٣٠', defaultValidityMonths: 12, defaultExpiryDate: '2027-11-25' },
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
  } catch {
    // ignore storage errors
  }
}

export const loadManagedVillages = (): ManagedVillageRecord[] =>
  safeLoad(KEYS.villages, INITIAL_MANAGED_VILLAGES);
export const saveManagedVillages = (list: ManagedVillageRecord[]) => safeSave(KEYS.villages, list);

export const loadManagedTableHeaders = (): ManagedTableHeaderRegistry[] =>
  safeLoad(KEYS.tableHeaders, INITIAL_MANAGED_TABLE_HEADERS);
export const saveManagedTableHeaders = (list: ManagedTableHeaderRegistry[]) =>
  safeSave(KEYS.tableHeaders, list);

export const loadManagedCatalogs = (): ManagedDropdownCatalogItem[] =>
  safeLoad(KEYS.catalogs, INITIAL_DROPDOWN_CATALOGS);
export const saveManagedCatalogs = (list: ManagedDropdownCatalogItem[]) =>
  safeSave(KEYS.catalogs, list);

export const loadMasterDocExpiries = (): MasterDocumentExpiryEntry[] =>
  safeLoad(KEYS.docExpiries, INITIAL_DOC_EXPIRY_ENTRIES);
export const saveMasterDocExpiries = (list: MasterDocumentExpiryEntry[]) =>
  safeSave(KEYS.docExpiries, list);

export function factoryResetDropdownListsStore(): void {
  saveManagedVillages([]);
  saveManagedCatalogs([]);
  saveMasterDocExpiries([]);
  saveManagedTableHeaders(INITIAL_MANAGED_TABLE_HEADERS);
}
