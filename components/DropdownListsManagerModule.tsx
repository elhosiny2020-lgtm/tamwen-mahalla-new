'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Columns3,
  Download,
  FileBadge2,
  ListChecks,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  INITIAL_MANAGED_TABLE_HEADERS,
  ManagedDropdownCatalogItem,
  ManagedTableHeaderRegistry,
  ManagedVillageRecord,
  MasterDocumentExpiryEntry,
  factoryResetDropdownListsStore,
  loadManagedCatalogs,
  loadManagedTableHeaders,
  loadManagedVillages,
  loadMasterDocExpiries,
  saveManagedCatalogs,
  saveManagedTableHeaders,
  saveManagedVillages,
  saveMasterDocExpiries,
} from '@/lib/dropdown-lists-store';
import { MAHALLA_LOCAL_UNITS } from '@/lib/bakery-math';
import { formatDateArabic, toArabicNumerals } from '@/lib/utils';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import ChicArabicDatepicker from './ChicArabicDatepicker';
import FactoryResetButton from './FactoryResetButton';
import TableToolbar from './TableToolbar';
import {
  EditableFieldSpec,
  TableActionButtons,
  UniversalCrudModal,
} from './trade/TradeSharedCrudUi';

type DropdownManagerTab = 'table_headers' | 'villages' | 'catalogs' | 'doc_expiries';

const CATALOG_GROUP_LABELS: Record<ManagedDropdownCatalogItem['groupKey'], string> = {
  license_types: 'أنواع التراخيص الرسمية',
  card_types: 'أنواع البطاقات التموينية والضريبية',
  commodity_categories: 'تصنيفات السلع التموينية والأسواق',
  outlet_types: 'أنواع المنافذ التموينية والتجار',
  establishment_categories: 'تصنيفات المحلات والمنشآت التجارية',
  violation_groups: 'تصنيفات المخالفات والقرارات الوزارية',
};

interface DropdownListsManagerModuleProps {
  currentUserName: string;
}

export default function DropdownListsManagerModule({
  currentUserName,
}: DropdownListsManagerModuleProps) {
  const todayRef = '2026-11-25';

  const [activeTab, setActiveTab] = useState<DropdownManagerTab>('doc_expiries');
  const [tableHeaders, setTableHeaders] = useState<ManagedTableHeaderRegistry[]>(() =>
    loadManagedTableHeaders()
  );
  const [selectedTableId, setSelectedTableId] = useState<string>(
    INITIAL_MANAGED_TABLE_HEADERS[0].tableId
  );
  const [villages, setVillages] = useState<ManagedVillageRecord[]>(() => loadManagedVillages());
  const [catalogs, setCatalogs] = useState<ManagedDropdownCatalogItem[]>(() =>
    loadManagedCatalogs()
  );
  const [docExpiries, setDocExpiries] = useState<MasterDocumentExpiryEntry[]>(() =>
    loadMasterDocExpiries()
  );

  // فلاتر البحث
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogGroupFilter, setCatalogGroupFilter] = useState<string>('ALL');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // حالة التثبيت اليدوي / إلغاء التثبيت لأشرطة الجداول
  const [pinnedMode, setPinnedMode] = useState<'none' | 'manual'>('none');

  // إضافة عمود جديد لأي جدول
  const [newColKey, setNewColKey] = useState('');
  const [newColLabel, setNewColLabel] = useState('');

  // نافذة العرض / التعديل / الإضافة الموحدة
  const [crudModal, setCrudModal] = useState<{
    title: string;
    mode: 'view' | 'edit';
    record: Record<string, unknown>;
    fields: EditableFieldSpec[];
    onSave?: (updated: Record<string, unknown>) => void;
  } | null>(null);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // إعادة ضبط المصنع لكافة قوائم وبيانات الشاشة
  const handleFactoryReset = () => {
    factoryResetDropdownListsStore();
    setVillages([]);
    setCatalogs([]);
    setDocExpiries([]);
    setTableHeaders(INITIAL_MANAGED_TABLE_HEADERS);
    notify('تم تنفيذ إعادة ضبط المصنع ومسح جميع البيانات المدخلة في القوائم والقرى والتراخيص والسجلات.');
  };

  // إحصائيات صلاحية التراخيص والبطاقات والسجلات
  const docStats = useMemo(() => {
    let expiredCount = 0;
    let expiringSoonCount = 0;
    const soonThreshold = '2027-02-25';
    docExpiries.forEach((d) => {
      const dates = [d.licenseExpiryDate, d.taxCardExpiryDate, d.commercialRegisterExpiryDate];
      if (dates.some((dt) => dt && dt < todayRef)) expiredCount++;
      else if (dates.some((dt) => dt && dt >= todayRef && dt <= soonThreshold)) expiringSoonCount++;
    });
    return {
      totalDocs: docExpiries.length,
      expiredCount,
      expiringSoonCount,
      totalVillages: villages.length,
      totalCatalogs: catalogs.length,
      totalTables: tableHeaders.length,
    };
  }, [docExpiries, villages, catalogs, tableHeaders, todayRef]);

  const activeTableRegistry = useMemo(
    () => tableHeaders.find((t) => t.tableId === selectedTableId) || tableHeaders[0],
    [tableHeaders, selectedTableId]
  );

  // ==================== حقول CRUD ====================
  const villageFields: EditableFieldSpec[] = [
    { key: 'villageName', label: 'اسم القرية / الشياخة' },
    { key: 'localUnitName', label: 'الوحدة المحلية التابعة لها', type: 'select', options: MAHALLA_LOCAL_UNITS },
    { key: 'supplyAdministration', label: 'الإدارة التموينية' },
  ];

  const catalogFields: EditableFieldSpec[] = [
    {
      key: 'groupKey',
      label: 'مجموعة القائمة المنسدلة',
      type: 'select',
      options: Object.keys(CATALOG_GROUP_LABELS),
    },
    { key: 'label', label: 'اسم البند / التصنيف' },
    { key: 'authorityOrMeta', label: 'الجهة المختصة / البيان المرجعي' },
    { key: 'defaultValidityMonths', label: 'مدة الصلاحية الافتراضية (شهر)', type: 'number' },
    { key: 'defaultExpiryDate', label: 'تاريخ انتهاء الفترة الافتراضي (كالندر)', type: 'date' },
  ];

  const docExpiryFields: EditableFieldSpec[] = [
    {
      key: 'sectionLabel',
      label: 'القسم المختص بالمنظومة',
      type: 'select',
      options: ['المخابز البلدية', 'التجارة الداخلية', 'السلع التموينية', 'البوتاجاز والوقود', 'المديونيات والرقابة'],
    },
    { key: 'entityCode', label: 'كود المنشأة / المخبز / التاجر' },
    { key: 'entityName', label: 'اسم المنشأة / المخبز / المنفذ' },
    { key: 'ownerName', label: 'اسم صاحب النشاط / التاجر' },
    { key: 'village', label: 'القرية', type: 'select', options: villages.length > 0 ? villages.map((v) => v.villageName) : ['صفط تراب', 'محلة أبو علي', 'الهياتم', 'دمرو'] },
    { key: 'localUnit', label: 'الوحدة المحلية', type: 'select', options: MAHALLA_LOCAL_UNITS },
    { key: 'licenseNumber', label: 'رقم الترخيص' },
    { key: 'licenseExpiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
    { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
    { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
    { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
    { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
  ];

  // ==================== معالجات الإضافة والتحديث ====================
  const handleUpdateHeaderLabel = (tableId: string, colKey: string, newLabel: string) => {
    const updated = tableHeaders.map((t) =>
      t.tableId === tableId
        ? {
            ...t,
            columns: t.columns.map((c) => (c.key === colKey ? { ...c, customLabel: newLabel } : c)),
          }
        : t
    );
    setTableHeaders(updated);
    saveManagedTableHeaders(updated);
  };

  const handleAddColumnHeader = () => {
    if (!newColLabel.trim() || !activeTableRegistry) return;
    const key = newColKey.trim() || `custom_col_${Date.now()}`;
    const updated = tableHeaders.map((t) =>
      t.tableId === activeTableRegistry.tableId
        ? {
            ...t,
            columns: [
              ...t.columns,
              { key, defaultLabel: newColLabel.trim(), customLabel: newColLabel.trim() },
            ],
          }
        : t
    );
    setTableHeaders(updated);
    saveManagedTableHeaders(updated);
    setNewColKey('');
    setNewColLabel('');
    notify(`تمت إضافة رأس العمود (${newColLabel.trim()}) إلى جدول ${activeTableRegistry.tableName}.`);
  };

  const handleDeleteColumnHeader = (tableId: string, colKey: string) => {
    const updated = tableHeaders.map((t) =>
      t.tableId === tableId
        ? { ...t, columns: t.columns.filter((c) => c.key !== colKey) }
        : t
    );
    setTableHeaders(updated);
    saveManagedTableHeaders(updated);
    notify('تم حذف رأس العمود من قائمة الجدول.');
  };

  const handleAddVillage = () => {
    const draft: ManagedVillageRecord = {
      id: `vil-${Date.now()}`,
      villageName: '',
      localUnitName: MAHALLA_LOCAL_UNITS[0],
      supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
      isActive: true,
    };
    setCrudModal({
      title: 'إضافة قرية / وحدة محلية جديدة إلى القوائم المنسدلة',
      mode: 'edit',
      record: draft as unknown as Record<string, unknown>,
      fields: villageFields,
      onSave: (updated) => {
        const next = [updated as unknown as ManagedVillageRecord, ...villages];
        setVillages(next);
        saveManagedVillages(next);
        notify(`تمت إضافة القرية (${String(updated.villageName)}) وربطها بالوحدة المحلية.`);
      },
    });
  };

  const handleAddCatalogItem = () => {
    const draft: ManagedDropdownCatalogItem = {
      id: `cat-${Date.now()}`,
      groupKey: catalogGroupFilter === 'ALL' ? 'license_types' : (catalogGroupFilter as ManagedDropdownCatalogItem['groupKey']),
      label: '',
      authorityOrMeta: 'مديرية التموين والتجارة الداخلية بالغربية',
      defaultValidityMonths: 24,
      defaultExpiryDate: '2028-11-25',
    };
    setCrudModal({
      title: 'إضافة بند جديد إلى القوائم المنسدلة وتحديد تاريخ الانتهاء الافتراضي',
      mode: 'edit',
      record: draft as unknown as Record<string, unknown>,
      fields: catalogFields,
      onSave: (updated) => {
        const next = [updated as unknown as ManagedDropdownCatalogItem, ...catalogs];
        setCatalogs(next);
        saveManagedCatalogs(next);
        notify('تمت إضافة البند الجديد إلى القوائم المنسدلة المركزية.');
      },
    });
  };

  const handleAddDocExpiry = () => {
    const draft: MasterDocumentExpiryEntry = {
      id: `mde-${Date.now()}`,
      sectionLabel: sectionFilter === 'ALL' ? 'التجارة الداخلية' : sectionFilter,
      entityCode: `ENT-${Date.now().toString().slice(-4)}`,
      entityName: '',
      ownerName: '',
      village: villages[0]?.villageName || 'صفط تراب',
      localUnit: villages[0]?.localUnitName || MAHALLA_LOCAL_UNITS[0],
      licenseNumber: '',
      licenseExpiryDate: '2028-11-25',
      taxCardNumber: '',
      taxCardExpiryDate: '2028-11-25',
      commercialRegisterNumber: '',
      commercialRegisterExpiryDate: '2028-11-25',
    };
    setCrudModal({
      title: 'إضافة سجل تراخيص وبطاقة ضريبية وسجل تجاري جديد',
      mode: 'edit',
      record: draft as unknown as Record<string, unknown>,
      fields: docExpiryFields,
      onSave: (updated) => {
        const next = [updated as unknown as MasterDocumentExpiryEntry, ...docExpiries];
        setDocExpiries(next);
        saveMasterDocExpiries(next);
        notify('تم حفظ سجل التراخيص والبطاقة الضريبية والسجل التجاري بنجاح.');
      },
    });
  };

  const handleInlineDocDateChange = (
    id: string,
    field: 'licenseExpiryDate' | 'taxCardExpiryDate' | 'commercialRegisterExpiryDate',
    nextIso: string
  ) => {
    const next = docExpiries.map((d) => (d.id === id ? { ...d, [field]: nextIso } : d));
    setDocExpiries(next);
    saveMasterDocExpiries(next);
    notify(`تم تحديث تاريخ الانتهاء عبر التقويم (${formatDateArabic(nextIso)}).`);
  };

  const filteredVillages = useMemo(
    () =>
      villages.filter(
        (v) =>
          !searchTerm ||
          v.villageName.includes(searchTerm) ||
          v.localUnitName.includes(searchTerm) ||
          v.supplyAdministration.includes(searchTerm)
      ),
    [villages, searchTerm]
  );

  const filteredCatalogs = useMemo(
    () =>
      catalogs.filter(
        (c) =>
          (catalogGroupFilter === 'ALL' || c.groupKey === catalogGroupFilter) &&
          (!searchTerm || c.label.includes(searchTerm) || c.authorityOrMeta.includes(searchTerm))
      ),
    [catalogs, catalogGroupFilter, searchTerm]
  );

  const filteredDocs = useMemo(
    () =>
      docExpiries.filter(
        (d) =>
          (sectionFilter === 'ALL' || d.sectionLabel === sectionFilter) &&
          (!searchTerm ||
            d.entityName.includes(searchTerm) ||
            d.ownerName.includes(searchTerm) ||
            d.village.includes(searchTerm) ||
            d.licenseNumber.includes(searchTerm) ||
            d.taxCardNumber.includes(searchTerm) ||
            d.commercialRegisterNumber.includes(searchTerm))
      ),
    [docExpiries, sectionFilter, searchTerm]
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* الترويسة الرسمية لقسم إدارة القوائم المنسدلة */}
      <div className="bg-gradient-to-l from-[#102A43] via-[#164E83] to-[#102A43] text-white rounded-2xl p-5 border-2 border-[#C6A15B]/50 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C6A15B]/20 border border-[#C6A15B] flex items-center justify-center shrink-0">
              <ListChecks className="w-6 h-6 text-[#C6A15B]" />
            </div>
            <div>
              <span className="text-[11px] font-black text-[#C6A15B] block">
                المركز الموحد للتحكم في كافة الجداول والقوائم المنسدلة وتواريخ الصلاحية
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                إدارة القوائم المنسدلة ورؤوس الجداول وتقاويم انتهاء التراخيص والبطاقات
              </h2>
              <p className="text-xs font-bold text-blue-100 mt-1">
                تعديل رؤوس الأعمدة لجميع الجداول · إدارة القرى والوحدات المحلية · البطاقات الضريبية والسجلات التجارية والتراخيص بكالندر عربي تفاعلي — المستخدم: {currentUserName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FactoryResetButton
              sectionName="إدارة القوائم المنسدلة والقرى والتراخيص"
              onConfirmReset={handleFactoryReset}
            />
          </div>
        </div>

        {/* بطاقات ملخص سريعة باحتواء تلقائي للنصوص */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4">
          <div className="bg-white/10 border border-white/15 rounded-xl p-3">
            <span className="text-[10.5px] font-bold text-blue-100 block leading-snug break-words">
              جداول المنظومة القابلة لتعديل رؤوسها
            </span>
            <span className="text-xl font-black text-[#C6A15B] num-cell block mt-1">
              {toArabicNumerals(docStats.totalTables)}
            </span>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3">
            <span className="text-[10.5px] font-bold text-blue-100 block leading-snug break-words">
              القرى والوحدات المحلية المسجلة
            </span>
            <span className="text-xl font-black text-white num-cell block mt-1">
              {toArabicNumerals(docStats.totalVillages)}
            </span>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3">
            <span className="text-[10.5px] font-bold text-blue-100 block leading-snug break-words">
              بنود القوائم المنسدلة النشطة
            </span>
            <span className="text-xl font-black text-white num-cell block mt-1">
              {toArabicNumerals(docStats.totalCatalogs)}
            </span>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3">
            <span className="text-[10.5px] font-bold text-blue-100 block leading-snug break-words">
              سجلات التراخيص والضريبية والسجل التجاري
            </span>
            <span className="text-xl font-black text-[#C6A15B] num-cell block mt-1">
              {toArabicNumerals(docStats.totalDocs)}
            </span>
          </div>
          <div className="bg-red-500/20 border border-red-300/40 rounded-xl p-3">
            <span className="text-[10.5px] font-bold text-red-100 block leading-snug break-words">
              مستندات وتراخيص منتهية الصلاحية
            </span>
            <span className="text-xl font-black text-red-200 num-cell block mt-1">
              {toArabicNumerals(docStats.expiredCount)}
            </span>
          </div>
          <div className="bg-amber-500/20 border border-amber-300/40 rounded-xl p-3">
            <span className="text-[10.5px] font-bold text-amber-100 block leading-snug break-words">
              قاربت على الانتهاء (خلال ٩٠ يوماً)
            </span>
            <span className="text-xl font-black text-amber-200 num-cell block mt-1">
              {toArabicNumerals(docStats.expiringSoonCount)}
            </span>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-600 text-emerald-900 rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* شريط التبويبات العلوية المنظمة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          {
            id: 'doc_expiries' as const,
            title: 'تقاويم انتهاء التراخيص والضريبية والسجل التجاري',
            sub: 'اختيار تواريخ الانتهاء عبر كالندر عربي لكل الجداول',
            icon: CalendarClock,
            count: docExpiries.length,
          },
          {
            id: 'table_headers' as const,
            title: 'تعديل رؤوس أعمدة جميع جداول المنظومة',
            sub: 'إعادة تسمية أو إضافة عناوين الأعمدة لكل قسم',
            icon: Columns3,
            count: tableHeaders.length,
          },
          {
            id: 'villages' as const,
            title: 'القرى والوحدات المحلية والإدارات',
            sub: 'إضافة وتعديل وحذف القرى والوحدات المحلية',
            icon: MapPin,
            count: villages.length,
          },
          {
            id: 'catalogs' as const,
            title: 'قوائم البطاقات والتراخيص والسلع والأنشطة',
            sub: 'بنود القوائم المنسدلة ومدد الصلاحية الافتراضية',
            icon: FileBadge2,
            count: catalogs.length,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
              }}
              className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-start gap-3 ${
                active
                  ? 'bg-[#102A43] text-white border-[#C6A15B] shadow-md'
                  : 'bg-white text-[#102A43] border-slate-200 hover:border-[#164E83]'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  active ? 'bg-[#C6A15B]/20 text-[#C6A15B]' : 'bg-blue-50 text-[#164E83]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black leading-snug break-words">{tab.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black num-cell shrink-0 ${
                      active ? 'bg-[#C6A15B] text-[#102A43]' : 'bg-slate-100 text-[#164E83]'
                    }`}
                  >
                    {toArabicNumerals(tab.count)}
                  </span>
                </div>
                <span
                  className={`text-[10.5px] font-bold block mt-1 leading-snug break-words ${
                    active ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {tab.sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ==================== التبويب ١: سجل التراخيص والبطاقات الضريبية والسجلات التجارية بكالندر تفاعلي ==================== */}
      {activeTab === 'doc_expiries' && (
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-4 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                الجدول الموحد لتواريخ انتهاء التراخيص والبطاقات الضريبية والسجلات التجارية (كالندر تفاعلي)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                انقر مباشرة على أي تاريخ داخل الجدول لفتح التقويم العربي الأنيق وتحديث تاريخ الانتهاء فوراً لجميع الأقسام
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم / القرية / الرقم..."
                  className="pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 font-bold w-56"
                />
              </div>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white"
              >
                <option value="ALL">جميع الأقسام ({toArabicNumerals(docExpiries.length)})</option>
                <option value="المخابز البلدية">المخابز البلدية</option>
                <option value="التجارة الداخلية">التجارة الداخلية</option>
                <option value="السلع التموينية">السلع التموينية</option>
                <option value="البوتاجاز والوقود">البوتاجاز والوقود</option>
              </select>
              <button
                type="button"
                onClick={handleAddDocExpiry}
                className="px-3.5 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة سجل تراخيص جديد</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportCsvUtf8Bom(
                    'سجل_انتهاء_التراخيص_والضريبية_والسجل_التجاري.csv',
                    [
                      'القسم',
                      'الكود',
                      'اسم المنشأة/المخبز',
                      'صاحب النشاط',
                      'القرية',
                      'الوحدة المحلية',
                      'رقم الترخيص',
                      'انتهاء الترخيص',
                      'البطاقة الضريبية',
                      'انتهاء البطاقة الضريبية',
                      'السجل التجاري',
                      'انتهاء السجل التجاري',
                    ],
                    filteredDocs.map((d) => [
                      d.sectionLabel,
                      d.entityCode,
                      d.entityName,
                      d.ownerName,
                      d.village,
                      d.localUnit,
                      d.licenseNumber,
                      d.licenseExpiryDate,
                      d.taxCardNumber,
                      d.taxCardExpiryDate,
                      d.commercialRegisterNumber,
                      d.commercialRegisterExpiryDate,
                    ])
                  );
                  notify('تم تصدير سجل تواريخ الانتهاء إلى ملف Excel (UTF-8) بنجاح.');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          <TableToolbar
            tableName="سجل التراخيص والبطاقات الضريبية والسجلات التجارية"
            totalRows={filteredDocs.length}
            pinnedCount={pinnedMode === 'manual' ? 2 : 0}
            onClearPins={() => {
              setPinnedMode('none');
              notify('تم إلغاء التثبيت لجميع الأعمدة.');
            }}
            onManualPin={() => {
              setPinnedMode('manual');
              notify('تم إكمال التثبيت يدوياً لأعمدة الكود واسم المنشأة.');
            }}
          />

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className={`p-2.5 border border-slate-700 ${pinnedMode === 'manual' ? 'sticky right-0 z-20 bg-[#102A43]' : ''}`}>القسم / الكود</th>
                  <th className={`p-2.5 border border-slate-700 ${pinnedMode === 'manual' ? 'sticky right-28 z-20 bg-[#102A43]' : ''}`}>المنشأة وصاحب النشاط</th>
                  <th className="p-2.5 border border-slate-700">القرية / الوحدة المحلية</th>
                  <th className="p-2.5 border border-slate-700 min-w-[200px]">رقم الترخيص وانتهاؤه (كالندر)</th>
                  <th className="p-2.5 border border-slate-700 min-w-[200px]">البطاقة الضريبية وانتهاؤها (كالندر)</th>
                  <th className="p-2.5 border border-slate-700 min-w-[200px]">السجل التجاري وانتهاؤه (كالندر)</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                      لا توجد سجلات تراخيص مدخلة حالياً — انقر «إضافة سجل تراخيص جديد» للبدء.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((d) => (
                    <tr key={d.id} className="border-b border-slate-200 hover:bg-slate-50 align-top">
                      <td className={`p-2.5 ${pinnedMode === 'manual' ? 'sticky right-0 z-10 bg-white' : ''}`}>
                        <span className="text-[10px] font-black text-[#164E83] block">{d.sectionLabel}</span>
                        <span className="num-cell font-black text-[#102A43]">{d.entityCode}</span>
                      </td>
                      <td className={`p-2.5 ${pinnedMode === 'manual' ? 'sticky right-28 z-10 bg-white' : ''}`}>
                        <span className="font-black text-[#102A43] block">{d.entityName}</span>
                        <span className="text-[11px] font-bold text-slate-600">{d.ownerName}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-black text-slate-800 block">{d.village}</span>
                        <span className="text-[10.5px] font-bold text-slate-500">{d.localUnit}</span>
                      </td>
                      <td className="p-2.5 space-y-1.5">
                        <span className="num-cell font-black text-[#164E83] block text-[11px]">
                          ترخيص: {d.licenseNumber || '—'}
                        </span>
                        <ChicArabicDatepicker
                          value={d.licenseExpiryDate}
                          onChange={(iso) => handleInlineDocDateChange(d.id, 'licenseExpiryDate', iso)}
                          todayRef={todayRef}
                          compact
                        />
                      </td>
                      <td className="p-2.5 space-y-1.5">
                        <span className="num-cell font-black text-[#102A43] block text-[11px]">
                          ضريبية: {d.taxCardNumber || '—'}
                        </span>
                        <ChicArabicDatepicker
                          value={d.taxCardExpiryDate}
                          onChange={(iso) => handleInlineDocDateChange(d.id, 'taxCardExpiryDate', iso)}
                          todayRef={todayRef}
                          compact
                        />
                      </td>
                      <td className="p-2.5 space-y-1.5">
                        <span className="num-cell font-black text-[#102A43] block text-[11px]">
                          سجل: {d.commercialRegisterNumber || '—'}
                        </span>
                        <ChicArabicDatepicker
                          value={d.commercialRegisterExpiryDate}
                          onChange={(iso) => handleInlineDocDateChange(d.id, 'commercialRegisterExpiryDate', iso)}
                          todayRef={todayRef}
                          compact
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          recordLabel={d.entityName || d.entityCode}
                          onView={() =>
                            setCrudModal({
                              title: `معاينة مستندات: ${d.entityName}`,
                              mode: 'view',
                              record: d as unknown as Record<string, unknown>,
                              fields: docExpiryFields,
                            })
                          }
                          onAdd={handleAddDocExpiry}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل مستندات: ${d.entityName}`,
                              mode: 'edit',
                              record: d as unknown as Record<string, unknown>,
                              fields: docExpiryFields,
                              onSave: (updated) => {
                                const next = docExpiries.map((item) =>
                                  item.id === d.id
                                    ? (updated as unknown as MasterDocumentExpiryEntry)
                                    : item
                                );
                                setDocExpiries(next);
                                saveMasterDocExpiries(next);
                                notify(`تم تحديث بيانات وتواريخ (${d.entityName}) بنجاح.`);
                              },
                            })
                          }
                          onDelete={() => {
                            const next = docExpiries.filter((item) => item.id !== d.id);
                            setDocExpiries(next);
                            saveMasterDocExpiries(next);
                            notify(`تم حذف سجل (${d.entityName}) من قاعدة بيانات التراخيص.`);
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== التبويب ٢: تعديل رؤوس أعمدة جميع الجداول ==================== */}
      {activeTab === 'table_headers' && activeTableRegistry && (
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-4 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                تخصيص وتعديل رؤوس وعناوين أعمدة كافة جداول المنظومة
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                اختر أي جدول من جداول المنظومة لتعديل عناوين الأعمدة أو إضافة أعمدة جديدة وحفظها في القاعدة المحلية
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="px-3 py-2 rounded-xl border-2 border-[#164E83]/30 font-black bg-blue-50/40 text-[#102A43]"
              >
                {tableHeaders.map((t) => (
                  <option key={t.tableId} value={t.tableId}>
                    {t.sectionName} — {t.tableName} ({toArabicNumerals(t.columns.length)} عمود)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setTableHeaders(INITIAL_MANAGED_TABLE_HEADERS);
                  saveManagedTableHeaders(INITIAL_MANAGED_TABLE_HEADERS);
                  notify('تم استرجاع العناوين الافتراضية المعتمدة لجميع جداول المنظومة.');
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استرجاع العناوين الافتراضية</span>
              </button>
            </div>
          </div>

          {/* شريط إضافة عمود جديد */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-end gap-2 text-xs">
            <div className="flex-1 min-w-[200px]">
              <label className="font-black text-[#102A43] block mb-1">اسم عنوان العمود الجديد</label>
              <input
                type="text"
                value={newColLabel}
                onChange={(e) => setNewColLabel(e.target.value)}
                placeholder="مثال: رقم الملف الضريبي الإضافي / رقم السجل الصناعي"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
              />
            </div>
            <div className="w-48">
              <label className="font-black text-[#102A43] block mb-1">المفتاح البرمجي (اختياري)</label>
              <input
                type="text"
                value={newColKey}
                onChange={(e) => setNewColKey(e.target.value)}
                placeholder="extraFieldKey"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
              />
            </div>
            <button
              type="button"
              onClick={handleAddColumnHeader}
              className="px-4 py-1.5 rounded-lg bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة رأس عمود للجدول</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700 w-12 text-center">#</th>
                  <th className="p-2.5 border border-slate-700">مفتاح العمود</th>
                  <th className="p-2.5 border border-slate-700">العنوان الافتراضي</th>
                  <th className="p-2.5 border border-slate-700">العنوان المعروض حالياً (قابل للتعديل الفوري)</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {activeTableRegistry.columns.map((col, idx) => (
                  <tr key={col.key} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2.5 text-center num-cell font-black text-slate-500">
                      {toArabicNumerals(idx + 1)}
                    </td>
                    <td className="p-2.5 font-mono text-[11px] font-bold text-slate-600">{col.key}</td>
                    <td className="p-2.5 font-bold text-slate-700">{col.defaultLabel}</td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={col.customLabel}
                        onChange={(e) =>
                          handleUpdateHeaderLabel(activeTableRegistry.tableId, col.key, e.target.value)
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-black text-[#102A43] bg-white focus:border-[#164E83]"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <TableActionButtons
                        recordLabel={col.customLabel}
                        onView={() =>
                          notify(`عمود (${col.customLabel}) يتبع جدول ${activeTableRegistry.tableName}`)
                        }
                        onAdd={() => {
                          setNewColLabel('عمود إضافي جديد');
                        }}
                        onEdit={() => {
                          saveManagedTableHeaders(tableHeaders);
                          notify(`تم حفظ تعديل عنوان العمود (${col.customLabel}) بنجاح.`);
                        }}
                        onDelete={() =>
                          handleDeleteColumnHeader(activeTableRegistry.tableId, col.key)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                saveManagedTableHeaders(tableHeaders);
                notify(`تم اعتماد وحفظ رؤوس أعمدة جدول (${activeTableRegistry.tableName}) في المنظومة.`);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>اعتماد وحفظ كافة تعديلات رؤوس الأعمدة</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== التبويب ٣: القرى والوحدات المحلية ==================== */}
      {activeTab === 'villages' && (
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-4 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                إدارة قائمة القرى والوحدات المحلية والإدارات التموينية
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                تغذّي هذه القائمة جميع القوائم المنسدلة للقرى والوحدات المحلية في كافة أقسام المنظومة
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث باسم القرية أو الوحدة..."
                  className="pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 font-bold w-56"
                />
              </div>
              <button
                type="button"
                onClick={handleAddVillage}
                className="px-3.5 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة قرية / وحدة محلية</span>
              </button>
            </div>
          </div>

          <TableToolbar
            tableName="قائمة القرى والوحدات المحلية"
            totalRows={filteredVillages.length}
            pinnedCount={pinnedMode === 'manual' ? 1 : 0}
            onClearPins={() => setPinnedMode('none')}
            onManualPin={() => setPinnedMode('manual')}
          />

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700 w-12 text-center">#</th>
                  <th className={`p-2.5 border border-slate-700 ${pinnedMode === 'manual' ? 'sticky right-0 z-20 bg-[#102A43]' : ''}`}>اسم القرية</th>
                  <th className="p-2.5 border border-slate-700">الوحدة المحلية</th>
                  <th className="p-2.5 border border-slate-700">الإدارة التموينية</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredVillages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                      لا توجد قرى مسجلة حالياً — انقر «إضافة قرية / وحدة محلية» لإدخال القرى.
                    </td>
                  </tr>
                ) : (
                  filteredVillages.map((v, idx) => (
                    <tr key={v.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 text-center num-cell font-black text-slate-500">
                        {toArabicNumerals(idx + 1)}
                      </td>
                      <td className={`p-2.5 font-black text-[#102A43] ${pinnedMode === 'manual' ? 'sticky right-0 z-10 bg-white' : ''}`}>
                        {v.villageName}
                      </td>
                      <td className="p-2.5 font-bold text-[#164E83]">{v.localUnitName}</td>
                      <td className="p-2.5 font-bold text-slate-700">{v.supplyAdministration}</td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          recordLabel={v.villageName}
                          onView={() =>
                            setCrudModal({
                              title: `بيانات القرية: ${v.villageName}`,
                              mode: 'view',
                              record: v as unknown as Record<string, unknown>,
                              fields: villageFields,
                            })
                          }
                          onAdd={handleAddVillage}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل بيانات القرية: ${v.villageName}`,
                              mode: 'edit',
                              record: v as unknown as Record<string, unknown>,
                              fields: villageFields,
                              onSave: (updated) => {
                                const next = villages.map((item) =>
                                  item.id === v.id
                                    ? (updated as unknown as ManagedVillageRecord)
                                    : item
                                );
                                setVillages(next);
                                saveManagedVillages(next);
                                notify(`تم تحديث بيانات القرية (${String(updated.villageName)}).`);
                              },
                            })
                          }
                          onDelete={() => {
                            const next = villages.filter((item) => item.id !== v.id);
                            setVillages(next);
                            saveManagedVillages(next);
                            notify(`تم حذف القرية (${v.villageName}) من القوائم.`);
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== التبويب ٤: القوائم المنسدلة (البطاقات، التراخيص، السلع، المنافذ) ==================== */}
      {activeTab === 'catalogs' && (
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-4 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                إدارة بنود القوائم المنسدلة (التراخيص، البطاقات، السلع، الأنشطة، المخالفات)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                أضف أو عدّل بنود القوائم المنسدلة واختر تواريخ انتهاء الفترات الافتراضية عبر التقويم العربي
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={catalogGroupFilter}
                onChange={(e) => setCatalogGroupFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white"
              >
                <option value="ALL">جميع مجموعات القوائم ({toArabicNumerals(catalogs.length)})</option>
                {Object.entries(CATALOG_GROUP_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddCatalogItem}
                className="px-3.5 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند جديد للقائمة</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700">المجموعة</th>
                  <th className="p-2.5 border border-slate-700">اسم البند / التصنيف</th>
                  <th className="p-2.5 border border-slate-700">الجهة المختصة / المرجع</th>
                  <th className="p-2.5 border border-slate-700 text-center">الصلاحية (شهر)</th>
                  <th className="p-2.5 border border-slate-700 min-w-[200px]">انتهاء الفترة (كالندر)</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                      لا توجد بنود في القائمة المنسدلة حالياً.
                    </td>
                  </tr>
                ) : (
                  filteredCatalogs.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 font-black text-[#164E83]">
                        {CATALOG_GROUP_LABELS[item.groupKey] || item.groupKey}
                      </td>
                      <td className="p-2.5 font-black text-[#102A43]">{item.label}</td>
                      <td className="p-2.5 font-bold text-slate-600">{item.authorityOrMeta}</td>
                      <td className="p-2.5 text-center num-cell font-black">
                        {toArabicNumerals(item.defaultValidityMonths)} شهر
                      </td>
                      <td className="p-2.5">
                        <ChicArabicDatepicker
                          value={item.defaultExpiryDate}
                          onChange={(iso) => {
                            const next = catalogs.map((c) =>
                              c.id === item.id ? { ...c, defaultExpiryDate: iso } : c
                            );
                            setCatalogs(next);
                            saveManagedCatalogs(next);
                            notify(`تم تحديث تاريخ الانتهاء الافتراضي لبند (${item.label}).`);
                          }}
                          todayRef={todayRef}
                          compact
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          recordLabel={item.label}
                          onView={() =>
                            setCrudModal({
                              title: `تفاصيل البند: ${item.label}`,
                              mode: 'view',
                              record: item as unknown as Record<string, unknown>,
                              fields: catalogFields,
                            })
                          }
                          onAdd={handleAddCatalogItem}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل البند: ${item.label}`,
                              mode: 'edit',
                              record: item as unknown as Record<string, unknown>,
                              fields: catalogFields,
                              onSave: (updated) => {
                                const next = catalogs.map((c) =>
                                  c.id === item.id
                                    ? (updated as unknown as ManagedDropdownCatalogItem)
                                    : c
                                );
                                setCatalogs(next);
                                saveManagedCatalogs(next);
                                notify(`تم تحديث البند (${String(updated.label)}) بنجاح.`);
                              },
                            })
                          }
                          onDelete={() => {
                            const next = catalogs.filter((c) => c.id !== item.id);
                            setCatalogs(next);
                            saveManagedCatalogs(next);
                            notify(`تم حذف البند (${item.label}) من القائمة المنسدلة.`);
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* تنبيه إرشادي للربط المركزي */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs font-bold text-amber-950 flex items-center gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
        <span>
          جميع التعديلات في تواريخ الانتهاء (التراخيص، البطاقة الضريبية، السجل التجاري) والقرى والوحدات المحلية ورؤوس الجداول تُحفظ تلقائياً في المتصفح وتُستخدم لتغذية جداول وتنبيهات كافة أقسام المنظومة.
        </span>
      </div>

      {crudModal && (
        <UniversalCrudModal
          title={crudModal.title}
          mode={crudModal.mode}
          record={crudModal.record}
          fields={crudModal.fields}
          todayRef={todayRef}
          onClose={() => setCrudModal(null)}
          onSave={crudModal.onSave}
        />
      )}
    </div>
  );
}
