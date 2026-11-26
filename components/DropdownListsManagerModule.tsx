'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  CornerDownLeft,
  Download,
  Edit3,
  FileBadge2,
  FolderPlus,
  GripVertical,
  Layers,
  ListChecks,
  MapPin,
  Plus,
  Power,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import {
  INITIAL_DROPDOWN_GROUPS,
  INITIAL_MANAGED_TABLE_HEADERS,
  ManagedDropdownCatalogItem,
  ManagedDropdownListGroup,
  ManagedLocalUnitItem,
  ManagedTableHeaderRegistry,
  ManagedVillageRecord,
  MasterDocumentExpiryEntry,
  captureDropdownListsSnapshot,
  countSystemReferencesForValue,
  factoryResetDropdownListsStore,
  getDropdownListsTableSummary,
  isDuplicateLabel,
  loadManagedCatalogs,
  loadManagedDropdownGroups,
  loadManagedTableHeaders,
  loadManagedVillages,
  loadMasterDocExpiries,
  restoreDropdownListsSnapshot,
  saveManagedCatalogs,
  saveManagedDropdownGroups,
  saveManagedTableHeaders,
  saveManagedVillages,
  saveMasterDocExpiries,
} from '@/lib/dropdown-lists-store';
import { formatDateArabic, normalizeSearchText, toArabicNumerals } from '@/lib/utils';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import ChicArabicDatepicker from './ChicArabicDatepicker';
import FactoryResetButton from './FactoryResetButton';
import TableToolbar from './TableToolbar';
import {
  EditableFieldSpec,
  TableActionButtons,
  UniversalCrudModal,
} from './trade/TradeSharedCrudUi';

type DropdownManagerTab = 'villages' | 'catalogs' | 'doc_expiries' | 'table_headers';

let uidSeq = 1;
function makeUid(prefix: string): string {
  uidSeq += 1;
  return `${prefix}-${Date.now()}-${uidSeq}`;
}

interface DropdownListsManagerModuleProps {
  currentUserName: string;
}

export default function DropdownListsManagerModule({
  currentUserName,
}: DropdownListsManagerModuleProps) {
  const { isRtl, t } = useSystemPreferences();
  const todayRef = '2026-11-26';

  const [activeTab, setActiveTab] = useState<DropdownManagerTab>('villages');
  const [villages, setVillages] = useState<ManagedVillageRecord[]>(() => loadManagedVillages());
  const [groups, setGroups] = useState<ManagedDropdownListGroup[]>(() => loadManagedDropdownGroups());
  const [catalogs, setCatalogs] = useState<ManagedDropdownCatalogItem[]>(() => loadManagedCatalogs());
  const [docExpiries, setDocExpiries] = useState<MasterDocumentExpiryEntry[]>(() => loadMasterDocExpiries());
  const [tableHeaders, setTableHeaders] = useState<ManagedTableHeaderRegistry[]>(() => loadManagedTableHeaders());
  const [selectedTableId, setSelectedTableId] = useState<string>(INITIAL_MANAGED_TABLE_HEADERS[0].tableId);

  // حالة التدرج الهرمي للقرى والوحدات المحلية
  const [villageSearch, setVillageSearch] = useState('');
  const [expandedVillageIds, setExpandedVillageIds] = useState<Record<string, boolean>>(() => {
    const init = loadManagedVillages();
    const map: Record<string, boolean> = {};
    init.slice(0, 3).forEach((v) => {
      map[v.id] = true;
    });
    return map;
  });
  const [showAddVillageBox, setShowAddVillageBox] = useState(false);
  const [newVillageName, setNewVillageName] = useState('');
  const [newVillageAdmin, setNewVillageAdmin] = useState('إدارة تموين مركز المحلة الكبرى');
  const [addingUnitForVillageId, setAddingUnitForVillageId] = useState<string | null>(null);
  const [newUnitNameInput, setNewUnitNameInput] = useState('');
  const [editingVillageId, setEditingVillageId] = useState<string | null>(null);
  const [editVillageNameDraft, setEditVillageNameDraft] = useState('');
  const [editingUnitKey, setEditingUnitKey] = useState<{ villageId: string; unitId: string } | null>(null);
  const [editUnitNameDraft, setEditUnitNameDraft] = useState('');

  // حالة تبويب القوائم المنسدلة الذكية
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('governorates_centers');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupTitleAr, setNewGroupTitleAr] = useState('');
  const [newGroupTitleEn, setNewGroupTitleEn] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemParentId, setNewItemParentId] = useState<string>('');
  const [newItemMeta, setNewItemMeta] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemLabelDraft, setEditItemLabelDraft] = useState('');
  const [editItemMetaDraft, setEditItemMetaDraft] = useState('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // حالة سجل التراخيص والبطاقات
  const [docSearch, setDocSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [docVillageFilter, setDocVillageFilter] = useState('ALL');
  const [docUnitFilter, setDocUnitFilter] = useState('ALL');
  const [pinnedMode, setPinnedMode] = useState<'none' | 'manual'>('none');

  // إضافة عمود جديد لأي جدول
  const [newColKey, setNewColKey] = useState('');
  const [newColLabel, setNewColLabel] = useState('');

  // إشعارات ورسائل تحقق
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: 'info' | 'error' | 'success' } | null>(null);

  // نافذة العرض / التعديل / الإضافة الموحدة
  const [crudModal, setCrudModal] = useState<{
    title: string;
    mode: 'view' | 'edit';
    record: Record<string, unknown>;
    fields: EditableFieldSpec[];
    onSave?: (updated: Record<string, unknown>) => void;
  } | null>(null);

  const notify = (text: string, tone: 'info' | 'error' | 'success' = 'info') => {
    setToastMsg({ text, tone });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 4800);
  };

  const fmtNum = (n: number | string) => (isRtl ? toArabicNumerals(String(n)) : String(n));

  const persistVillages = (next: ManagedVillageRecord[]) => {
    setVillages(next);
    saveManagedVillages(next);
  };

  const persistGroups = (next: ManagedDropdownListGroup[]) => {
    setGroups(next);
    saveManagedDropdownGroups(next);
  };

  const persistCatalogs = (next: ManagedDropdownCatalogItem[]) => {
    setCatalogs(next);
    saveManagedCatalogs(next);
  };

  const persistDocs = (next: MasterDocumentExpiryEntry[]) => {
    setDocExpiries(next);
    saveMasterDocExpiries(next);
  };

  // ==================== ١. منطق القرى والوحدات المحلية المتدرج ====================
  const toggleVillageExpand = (villageId: string) => {
    setExpandedVillageIds((prev) => ({ ...prev, [villageId]: !prev[villageId] }));
  };

  const handleAddVillage = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newVillageName.trim();
    if (!cleanName) {
      notify(isRtl ? 'يرجى إدخال اسم القرية أولاً.' : 'Please enter the village name.', 'error');
      return;
    }
    if (isDuplicateLabel(villages.map((v) => v.villageName), cleanName)) {
      notify(t('duplicateBlockedMsg'), 'error');
      return;
    }
    const created: ManagedVillageRecord = {
      id: makeUid('vil'),
      villageName: cleanName,
      localUnitName: '',
      localUnits: [],
      supplyAdministration: newVillageAdmin.trim() || 'إدارة تموين مركز المحلة الكبرى',
      isActive: true,
      sortOrder: villages.length + 1,
    };
    const next = [created, ...villages];
    persistVillages(next);
    setExpandedVillageIds((prev) => ({ ...prev, [created.id]: true }));
    setAddingUnitForVillageId(created.id);
    setNewVillageName('');
    setShowAddVillageBox(false);
    notify(
      isRtl
        ? `تمت إضافة القرية (${cleanName}) بنجاح — يمكنك الآن إضافة الوحدات المحلية التابعة لها مباشرة.`
        : `Village (${cleanName}) added successfully — you can now add its local units right below.`,
      'success'
    );
  };

  const handleSaveVillageEdit = (villageId: string) => {
    const clean = editVillageNameDraft.trim();
    if (!clean) return;
    const otherNames = villages.filter((v) => v.id !== villageId).map((v) => v.villageName);
    if (isDuplicateLabel(otherNames, clean)) {
      notify(t('duplicateBlockedMsg'), 'error');
      return;
    }
    const next = villages.map((v) => (v.id === villageId ? { ...v, villageName: clean } : v));
    persistVillages(next);
    setEditingVillageId(null);
    notify(isRtl ? `تم تعديل اسم القرية إلى (${clean}) وتحديث القوائم المرتبطة فوراً.` : `Village renamed to (${clean}).`, 'success');
  };

  const handleToggleVillageActive = (village: ManagedVillageRecord) => {
    const next = villages.map((v) => (v.id === village.id ? { ...v, isActive: !v.isActive } : v));
    persistVillages(next);
    notify(
      village.isActive
        ? isRtl
          ? `تم تعطيل القرية (${village.villageName}) — لن تظهر في الإضافات الجديدة مع الاحتفاظ بها في السجلات القديمة.`
          : `Village (${village.villageName}) disabled — hidden from new entries while preserved in historical records.`
        : isRtl
        ? `تم إعادة تفعيل القرية (${village.villageName}) في كافة القوائم والنماذج.`
        : `Village (${village.villageName}) re-enabled.`,
      'info'
    );
  };

  const handleDeleteVillage = (village: ManagedVillageRecord) => {
    const refs = countSystemReferencesForValue(village.villageName, 'village');
    if (refs.total > 0) {
      notify(
        `${t('inUseDeleteBlocked')} (${refs.breakdown.join(' · ')})`,
        'error'
      );
      return;
    }
    persistVillages(villages.filter((v) => v.id !== village.id));
    notify(isRtl ? `تم حذف القرية (${village.villageName}) لعدم ارتباطها بأي سجلات.` : `Village (${village.villageName}) deleted.`, 'success');
  };

  const handleAddLocalUnitToVillage = (villageId: string) => {
    const clean = newUnitNameInput.trim();
    if (!clean) {
      notify(isRtl ? 'يرجى كتابة اسم الوحدة المحلية أولاً.' : 'Please enter the local unit name.', 'error');
      return;
    }
    const target = villages.find((v) => v.id === villageId);
    if (!target) return;
    if (isDuplicateLabel(target.localUnits.map((u) => u.name), clean)) {
      notify(t('duplicateBlockedMsg'), 'error');
      return;
    }
    const newUnit: ManagedLocalUnitItem = {
      id: makeUid('lu'),
      name: clean,
      isActive: true,
      sortOrder: target.localUnits.length + 1,
      createdAt: todayRef,
    };
    const next = villages.map((v) => {
      if (v.id !== villageId) return v;
      const updatedUnits = [...v.localUnits, newUnit];
      return {
        ...v,
        localUnits: updatedUnits,
        localUnitName: updatedUnits.find((u) => u.isActive)?.name || updatedUnits[0]?.name || '',
      };
    });
    persistVillages(next);
    setNewUnitNameInput('');
    notify(
      isRtl
        ? `تمت إضافة الوحدة المحلية (${clean}) تحت قرية (${target.villageName}) وتحديث القوائم المنسدلة فوراً.`
        : `Local unit (${clean}) added under (${target.villageName}).`,
      'success'
    );
  };

  const handleSaveLocalUnitEdit = (villageId: string, unitId: string) => {
    const clean = editUnitNameDraft.trim();
    if (!clean) return;
    const target = villages.find((v) => v.id === villageId);
    if (!target) return;
    const otherUnits = target.localUnits.filter((u) => u.id !== unitId).map((u) => u.name);
    if (isDuplicateLabel(otherUnits, clean)) {
      notify(t('duplicateBlockedMsg'), 'error');
      return;
    }
    const next = villages.map((v) => {
      if (v.id !== villageId) return v;
      const updatedUnits = v.localUnits.map((u) => (u.id === unitId ? { ...u, name: clean } : u));
      return {
        ...v,
        localUnits: updatedUnits,
        localUnitName: updatedUnits.find((u) => u.isActive)?.name || updatedUnits[0]?.name || '',
      };
    });
    persistVillages(next);
    setEditingUnitKey(null);
    notify(isRtl ? `تم تعديل اسم الوحدة المحلية إلى (${clean}).` : `Local unit renamed to (${clean}).`, 'success');
  };

  const handleToggleLocalUnitActive = (villageId: string, unit: ManagedLocalUnitItem) => {
    const next = villages.map((v) => {
      if (v.id !== villageId) return v;
      const updatedUnits = v.localUnits.map((u) =>
        u.id === unit.id ? { ...u, isActive: !u.isActive } : u
      );
      return {
        ...v,
        localUnits: updatedUnits,
        localUnitName: updatedUnits.find((u) => u.isActive)?.name || updatedUnits[0]?.name || '',
      };
    });
    persistVillages(next);
    notify(
      unit.isActive
        ? isRtl
          ? `تم تعطيل الوحدة المحلية (${unit.name}) مع الاحتفاظ بها في السجلات التاريخية.`
          : `Local unit (${unit.name}) disabled.`
        : isRtl
        ? `تم إعادة تفعيل الوحدة المحلية (${unit.name}).`
        : `Local unit (${unit.name}) enabled.`,
      'info'
    );
  };

  const handleDeleteLocalUnit = (villageId: string, unit: ManagedLocalUnitItem) => {
    const refs = countSystemReferencesForValue(unit.name, 'localUnit');
    if (refs.total > 0) {
      notify(`${t('inUseDeleteBlocked')} (${refs.breakdown.join(' · ')})`, 'error');
      return;
    }
    const next = villages.map((v) => {
      if (v.id !== villageId) return v;
      const updatedUnits = v.localUnits.filter((u) => u.id !== unit.id);
      return {
        ...v,
        localUnits: updatedUnits,
        localUnitName: updatedUnits.find((u) => u.isActive)?.name || updatedUnits[0]?.name || '',
      };
    });
    persistVillages(next);
    notify(isRtl ? `تم حذف الوحدة المحلية (${unit.name}).` : `Local unit (${unit.name}) deleted.`, 'success');
  };

  // ==================== ٢. منطق القوائم المنسدلة الذكية (المجموعات + السحب والترتيب + العناصر الفرعية) ====================
  const activeGroup = useMemo(
    () => groups.find((g) => g.groupKey === selectedGroupKey) || groups[0],
    [groups, selectedGroupKey]
  );

  const itemsInSelectedGroup = useMemo(() => {
    const q = normalizeSearchText(catalogSearch);
    return catalogs
      .filter((c) => c.groupKey === selectedGroupKey)
      .filter(
        (c) =>
          !q ||
          normalizeSearchText(c.label).includes(q) ||
          normalizeSearchText(c.authorityOrMeta).includes(q)
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [catalogs, selectedGroupKey, catalogSearch]);

  const groupItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    groups.forEach((g) => {
      counts[g.groupKey] = catalogs.filter((c) => c.groupKey === g.groupKey).length;
    });
    return counts;
  }, [groups, catalogs]);

  const handleCreateCustomGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const titleAr = newGroupTitleAr.trim();
    if (!titleAr) return;
    if (isDuplicateLabel(groups.map((g) => g.titleAr), titleAr)) {
      notify(t('duplicateBlockedMsg'), 'error');
      return;
    }
    const slug = `custom_${Date.now()}`;
    const nextGroup: ManagedDropdownListGroup = {
      id: makeUid('grp'),
      groupKey: slug,
      titleAr,
      titleEn: newGroupTitleEn.trim() || titleAr,
      descriptionAr: newGroupDesc.trim() || 'قائمة منسدلة مخصصة قابلة للتوسع دون تعديل برمجي',
      isSystem: false,
      sortOrder: groups.length + 1,
    };
    persistGroups([...groups, nextGroup]);
    setSelectedGroupKey(slug);
    setNewGroupTitleAr('');
    setNewGroupTitleEn('');
    setNewGroupDesc('');
    setShowAddGroupModal(false);
    notify(isRtl ? `تم إنشاء القائمة المنسدلة الجديدة (${titleAr}) بنجاح.` : `New list (${titleAr}) created.`, 'success');
  };

  const handleAddCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newItemLabel.trim();
    if (!clean) return;
    const existingInGroup = catalogs
      .filter((c) => c.groupKey === selectedGroupKey)
      .map((c) => c.label);
    if (isDuplicateLabel(existingInGroup, clean)) {
      notify(t('duplicateBlockedMsg'), 'error');
      return;
    }
    const maxOrder = catalogs
      .filter((c) => c.groupKey === selectedGroupKey)
      .reduce((m, c) => Math.max(m, c.sortOrder), 0);

    const created: ManagedDropdownCatalogItem = {
      id: makeUid('cat'),
      groupKey: selectedGroupKey,
      label: clean,
      parentItemId: newItemParentId || null,
      authorityOrMeta: newItemMeta.trim() || activeGroup?.titleAr || '',
      defaultValidityMonths: 12,
      defaultExpiryDate: '',
      isActive: true,
      sortOrder: maxOrder + 1,
    };
    persistCatalogs([...catalogs, created]);
    setNewItemLabel('');
    setNewItemParentId('');
    setNewItemMeta('');
    setShowAddItemForm(false);
    notify(isRtl ? `تمت إضافة العنصر (${clean}) إلى قائمة (${activeGroup?.titleAr}) بنجاح.` : `Item (${clean}) added.`, 'success');
  };

  const handleSaveCatalogItemEdit = (itemId: string) => {
    const clean = editItemLabelDraft.trim();
    if (!clean) return;
    const siblingLabels = catalogs
      .filter((c) => c.groupKey === selectedGroupKey && c.id !== itemId)
      .map((c) => c.label);
    if (isDuplicateLabel(siblingLabels, clean)) {
      notify(t('duplicateBlockedMsg'), 'error');
      return;
    }
    persistCatalogs(
      catalogs.map((c) =>
        c.id === itemId ? { ...c, label: clean, authorityOrMeta: editItemMetaDraft.trim() } : c
      )
    );
    setEditingItemId(null);
    notify(isRtl ? `تم تعديل العنصر إلى (${clean}).` : `Item updated to (${clean}).`, 'success');
  };

  const handleToggleCatalogItemActive = (item: ManagedDropdownCatalogItem) => {
    persistCatalogs(catalogs.map((c) => (c.id === item.id ? { ...c, isActive: !c.isActive } : c)));
    notify(
      item.isActive
        ? isRtl
          ? `تم تعطيل (${item.label}) — لن يظهر في الإضافات الجديدة مع بقاء السجلات القديمة سليمة.`
          : `Item (${item.label}) disabled.`
        : isRtl
        ? `تم تفعيل (${item.label}) بنجاح.`
        : `Item (${item.label}) enabled.`,
      'info'
    );
  };

  const handleDeleteCatalogItem = (item: ManagedDropdownCatalogItem) => {
    const hasChildren = catalogs.some((c) => c.parentItemId === item.id);
    if (hasChildren) {
      notify(
        isRtl
          ? 'لا يمكن حذف عنصر رئيسي يحتوي على عناصر فرعية تابعة له — قم بتعطيله أو نقل العناصر الفرعية أولاً.'
          : 'Cannot delete a parent item that has subordinate sub-items. Disable it instead.',
        'error'
      );
      return;
    }
    const refs = countSystemReferencesForValue(item.label, 'catalogItem');
    if (refs.total > 0) {
      notify(`${t('inUseDeleteBlocked')} (${refs.breakdown.join(' · ')})`, 'error');
      return;
    }
    persistCatalogs(catalogs.filter((c) => c.id !== item.id));
    notify(isRtl ? `تم حذف العنصر (${item.label}).` : `Item (${item.label}) deleted.`, 'success');
  };

  const reorderGroupItems = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const groupItems = catalogs
      .filter((c) => c.groupKey === selectedGroupKey)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const fromIdx = groupItems.findIndex((i) => i.id === fromId);
    const toIdx = groupItems.findIndex((i) => i.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...groupItems];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const orderMap = new Map(reordered.map((it, idx) => [it.id, idx + 1]));
    persistCatalogs(
      catalogs.map((c) => (orderMap.has(c.id) ? { ...c, sortOrder: orderMap.get(c.id)! } : c))
    );
  };

  const moveItemStep = (itemId: string, direction: 'up' | 'down') => {
    const groupItems = catalogs
      .filter((c) => c.groupKey === selectedGroupKey)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = groupItems.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= groupItems.length) return;
    reorderGroupItems(itemId, groupItems[targetIdx].id);
  };

  // ==================== ٣. إحصائيات وفلاتر القرى والمستندات ====================
  const filteredVillages = useMemo(() => {
    const q = normalizeSearchText(villageSearch);
    if (!q) return villages;
    return villages.filter(
      (v) =>
        normalizeSearchText(v.villageName).includes(q) ||
        normalizeSearchText(v.supplyAdministration).includes(q) ||
        v.localUnits.some((u) => normalizeSearchText(u.name).includes(q))
    );
  }, [villages, villageSearch]);

  const totalLocalUnitsCount = useMemo(
    () => villages.reduce((sum, v) => sum + v.localUnits.length, 0),
    [villages]
  );

  const activeVillageNamesList = useMemo(
    () =>
      villages
        .filter((v) => v.status === 'نشط')
        .map((v) => v.villageName)
        .filter(Boolean),
    [villages]
  );

  const cascadedUnitsForDocFilter = useMemo(() => {
    if (docVillageFilter === 'ALL') return [];
    const target = docVillageFilter.trim();
    const matched = villages.find((v) => v.villageName.trim() === target);
    if (!matched) return [];
    return matched.localUnits
      .filter((u) => u.isActive)
      .map((u) => u.name)
      .filter(Boolean);
  }, [docVillageFilter, villages]);

  const filteredDocs = useMemo(() => {
    const q = normalizeSearchText(docSearch);
    return docExpiries.filter((d) => {
      if (sectionFilter !== 'ALL' && d.sectionLabel !== sectionFilter) return false;
      if (docVillageFilter !== 'ALL' && d.village !== docVillageFilter) return false;
      if (docUnitFilter !== 'ALL' && d.localUnit !== docUnitFilter) return false;
      if (!q) return true;
      return (
        normalizeSearchText(d.entityName).includes(q) ||
        normalizeSearchText(d.ownerName).includes(q) ||
        normalizeSearchText(d.village).includes(q) ||
        normalizeSearchText(d.licenseNumber).includes(q) ||
        normalizeSearchText(d.taxCardNumber).includes(q) ||
        normalizeSearchText(d.commercialRegisterNumber).includes(q)
      );
    });
  }, [docExpiries, docSearch, sectionFilter, docVillageFilter, docUnitFilter]);

  const docFields: EditableFieldSpec[] = [
    {
      key: 'sectionLabel',
      label: 'القسم المختص',
      type: 'select',
      options: ['المخابز البلدية', 'التجارة الداخلية', 'السلع التموينية', 'البوتاجاز والوقود', 'المطاحن والصوامع'],
    },
    { key: 'entityCode', label: 'كود المنشأة / السجل' },
    { key: 'entityName', label: 'اسم المنشأة / المخبز / المستودع' },
    { key: 'ownerName', label: 'اسم التاجر / صاحب المخبز' },
    { key: 'village', label: 'القرية', type: 'select', options: activeVillageNamesList },
    { key: 'localUnit', label: 'الوحدة المحلية (تتحدث تلقائياً)', type: 'select', options: [] },
    { key: 'licenseNumber', label: 'رقم الترخيص' },
    { key: 'licenseExpiryDate', label: 'تاريخ انتهاء الترخيص', type: 'date' },
    { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
    { key: 'taxCardExpiryDate', label: 'تاريخ انتهاء البطاقة الضريبية', type: 'date' },
    { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
    { key: 'commercialRegisterExpiryDate', label: 'تاريخ انتهاء السجل التجاري', type: 'date' },
  ];

  const openAddDoc = () => {
    const defaultVillage = activeVillageNamesList[0] || '';
    const defaultUnit = defaultVillage ? getActiveLocalUnitsForVillage(defaultVillage)[0] || '' : '';
    const rec: MasterDocumentExpiryEntry = {
      id: makeUid('mde'),
      sectionLabel: 'المخابز البلدية',
      entityCode: `ENT-${docExpiries.length + 101}`,
      entityName: '',
      ownerName: '',
      village: defaultVillage,
      localUnit: defaultUnit,
      licenseNumber: '',
      licenseExpiryDate: '2028-11-26',
      taxCardNumber: '',
      taxCardExpiryDate: '2028-11-26',
      commercialRegisterNumber: '',
      commercialRegisterExpiryDate: '2028-11-26',
    };
    setCrudModal({
      title: isRtl
        ? 'إضافة سجل تراخيص وبطاقة ضريبية وسجل تجاري (ترابط تلقائي للقرى والوحدات)'
        : 'Add License, Tax Card & CR Record',
      mode: 'edit',
      record: rec as unknown as Record<string, unknown>,
      fields: docFields,
      onSave: (u) => {
        const item = u as unknown as MasterDocumentExpiryEntry;
        persistDocs([item, ...docExpiries]);
        notify(isRtl ? `تمت إضافة سجل المستندات للمنشأة (${item.entityName}) بنجاح.` : 'Document record added.', 'success');
      },
    });
  };

  const handleUpdateDocInlineDate = (
    id: string,
    field: 'licenseExpiryDate' | 'taxCardExpiryDate' | 'commercialRegisterExpiryDate',
    isoDate: string
  ) => {
    persistDocs(docExpiries.map((d) => (d.id === id ? { ...d, [field]: isoDate } : d)));
    notify(
      isRtl
        ? `تم تحديث تاريخ الانتهاء إلى (${formatDateArabic(isoDate)}) بنجاح.`
        : `Expiry date updated to ${isoDate}.`,
      'success'
    );
  };

  // ==================== ٤. رؤوس أعمدة الجداول ====================
  const activeTableRegistry = useMemo(
    () => tableHeaders.find((tb) => tb.tableId === selectedTableId) || tableHeaders[0],
    [tableHeaders, selectedTableId]
  );

  const handleUpdateColumnHeader = (tableId: string, colKey: string, newLabel: string) => {
    const next = tableHeaders.map((tb) =>
      tb.tableId === tableId
        ? {
            ...tb,
            columns: tb.columns.map((c) => (c.key === colKey ? { ...c, customLabel: newLabel } : c)),
          }
        : tb
    );
    setTableHeaders(next);
    saveManagedTableHeaders(next);
  };

  const handleAddColumnToTable = () => {
    if (!activeTableRegistry || !newColLabel.trim()) return;
    const key = newColKey.trim() || `custom_col_${Date.now()}`;
    const next = tableHeaders.map((tb) =>
      tb.tableId === activeTableRegistry.tableId
        ? {
            ...tb,
            columns: [...tb.columns, { key, defaultLabel: newColLabel.trim(), customLabel: newColLabel.trim() }],
          }
        : tb
    );
    setTableHeaders(next);
    saveManagedTableHeaders(next);
    setNewColKey('');
    setNewColLabel('');
    notify(isRtl ? `تمت إضافة العمود (${newColLabel.trim()}) إلى جدول (${activeTableRegistry.tableName}).` : 'Column added.', 'success');
  };

  const handleDeleteColumnFromTable = (tableId: string, colKey: string) => {
    const next = tableHeaders.map((tb) =>
      tb.tableId === tableId ? { ...tb, columns: tb.columns.filter((c) => c.key !== colKey) } : tb
    );
    setTableHeaders(next);
    saveManagedTableHeaders(next);
    notify(isRtl ? 'تم حذف العمود من تخطيط الجدول.' : 'Column removed.', 'info');
  };

  // ==================== إعادة ضبط المصنع والاسترجاع ====================
  const handleFactoryReset = (opts?: { clearCustomLists: boolean }) => {
    const clearCustom = Boolean(opts?.clearCustomLists);
    factoryResetDropdownListsStore(clearCustom);
    setVillages([]);
    setCatalogs([]);
    setDocExpiries([]);
    setTableHeaders(INITIAL_MANAGED_TABLE_HEADERS);
    if (clearCustom) {
      setGroups(INITIAL_DROPDOWN_GROUPS);
      setSelectedGroupKey(INITIAL_DROPDOWN_GROUPS[0].groupKey);
    }
    notify(
      isRtl
        ? 'تم تنفيذ إعادة ضبط المصنع وتفريغ جداول قسم القوائم المنسدلة والقرى بنجاح.'
        : 'Factory reset completed for Dropdown Lists & Villages section.',
      'success'
    );
  };

  const handleRestoreSnapshot = (snapshot: Record<string, unknown>) => {
    restoreDropdownListsSnapshot(snapshot);
    setVillages(loadManagedVillages());
    setGroups(loadManagedDropdownGroups());
    setCatalogs(loadManagedCatalogs());
    setDocExpiries(loadMasterDocExpiries());
    setTableHeaders(loadManagedTableHeaders());
    notify(isRtl ? 'تم استرجاع النسخة الاحتياطية بنجاح وتحديث جميع الجداول.' : 'Backup restored successfully.', 'success');
  };

  const docStats = useMemo(() => {
    let expiredCount = 0;
    docExpiries.forEach((d) => {
      const dates = [d.licenseExpiryDate, d.taxCardExpiryDate, d.commercialRegisterExpiryDate];
      if (dates.some((dt) => dt && dt < todayRef)) expiredCount++;
    });
    return { expiredCount };
  }, [docExpiries, todayRef]);

  return (
    <div className="space-y-5 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* الترويسة المؤسسية مع فصل زر إعادة ضبط المصنع باللون الأحمر في أقصى الطرف لتجنب الضغط بالخطأ */}
      <div className="bg-gradient-to-l from-[#0B1F33] via-[#102A43] to-[#164E83] text-white rounded-2xl p-5 border border-[#C6A15B]/40 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#C6A15B] text-[#102A43] flex items-center justify-center shrink-0 shadow">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-[#C6A15B]">
                {t('directorateTitle')} · {currentUserName}
              </p>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {t('dropdownModuleTitle')}
              </h2>
              <p className="text-xs font-bold text-slate-200 mt-0.5">
                {t('dropdownModuleSubtitle')}
              </p>
            </div>
          </div>

          {/* أزرار سريعة على جانب ومنطقة إعادة ضبط المصنع منفصلة تماماً */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab('villages');
                setShowAddVillageBox(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#C6A15B] hover:bg-amber-400 text-[#102A43] text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addNewVillage')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalogs')}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#C6A15B]" />
              <span>{isRtl ? 'إدارة القوائم المنسدلة' : 'Manage Dropdowns'}</span>
            </button>

            <div className="h-7 w-[1px] bg-white/20 hidden sm:block" />

            {/* زر إعادة ضبط المصنع معزول بصرياً باللون الأحمر التحذيري */}
            <FactoryResetButton
              sectionName={isRtl ? 'إدارة القرى والوحدات المحلية والقوائم المنسدلة' : 'Villages, Local Units & Dropdown Lists'}
              sectionKey="dropdown_lists"
              allowClearCustomLists
              getTableSummary={(includeCustom) => getDropdownListsTableSummary(includeCustom)}
              onCaptureBackup={captureDropdownListsSnapshot}
              onRestoreBackup={handleRestoreSnapshot}
              onConfirmReset={handleFactoryReset}
            />
          </div>
        </div>

        {/* مؤشرات إحصائية حية */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[11px] font-bold text-slate-200 block">
              {isRtl ? 'القرى والشياخات المسجلة' : 'Registered Villages'}
            </span>
            <span className="text-lg font-black text-[#C6A15B] num-cell">
              {fmtNum(villages.length)}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[11px] font-bold text-slate-200 block">
              {isRtl ? 'إجمالي الوحدات المحلية التابعة' : 'Subordinate Local Units'}
            </span>
            <span className="text-lg font-black text-emerald-300 num-cell">
              {fmtNum(totalLocalUnitsCount)}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[11px] font-bold text-slate-200 block">
              {isRtl ? 'القوائم المنسدلة والعناصر' : 'Dropdown Lists & Items'}
            </span>
            <span className="text-lg font-black text-white num-cell">
              {fmtNum(groups.length)} / {fmtNum(catalogs.length)}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[11px] font-bold text-slate-200 block">
              {isRtl ? 'تراخيص وسجلات منتهية' : 'Expired Docs'}
            </span>
            <span className="text-lg font-black text-red-300 num-cell">
              {fmtNum(docStats.expiredCount)}
            </span>
          </div>
        </div>
      </div>

      {/* شريط الإشعارات الفوري */}
      {toastMsg && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-black flex items-center justify-between gap-2 shadow-sm border ${
            toastMsg.tone === 'error'
              ? 'bg-red-50 text-red-900 border-red-300'
              : toastMsg.tone === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-[#102A43] text-[#C6A15B] border-[#C6A15B]/40'
          }`}
        >
          <span className="flex items-center gap-2">
            {toastMsg.tone === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="p-1 rounded hover:bg-black/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* شريط التبويبات الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          { id: 'villages' as DropdownManagerTab, label: t('tabVillagesHierarchy'), icon: MapPin, count: villages.length },
          { id: 'catalogs' as DropdownManagerTab, label: t('tabSmartDropdowns'), icon: Layers, count: catalogs.length },
          { id: 'doc_expiries' as DropdownManagerTab, label: t('tabDocExpiries'), icon: CalendarClock, count: docExpiries.length },
          { id: 'table_headers' as DropdownManagerTab, label: t('tabTableHeaders'), icon: Columns3, count: tableHeaders.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-2xl border text-right flex items-center justify-between gap-2 cursor-pointer transition-all ${
                active
                  ? 'bg-[#102A43] text-white border-[#C6A15B] shadow-md'
                  : 'bg-white text-[#102A43] border-slate-200 hover:border-[#164E83]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#C6A15B]' : 'text-[#164E83]'}`} />
                <span className="text-xs font-black leading-snug">{tab.label}</span>
              </div>
              <span
                className={`num-cell px-2 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
                  active ? 'bg-[#C6A15B] text-[#102A43]' : 'bg-slate-100 text-[#164E83]'
                }`}
              >
                {fmtNum(tab.count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ==================== التبويب ١: إدارة القرى والوحدات المحلية بالتدرج الذكي ==================== */}
      {activeTab === 'villages' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-[#102A43] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#164E83]" />
                <span>{isRtl ? 'شاشة إدارة القرى والوحدات المحلية التابعة لها' : 'Villages & Subordinate Local Units'}</span>
              </h3>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                {isRtl
                  ? 'أضف القرية أولاً ثم اضغط على اسمها لفتح الوحدات المحلية التابعة لها وإضافة عدد غير محدود من الوحدات المحلية — التحديث ينعكس فوراً على جميع النماذج والفلاتر.'
                  : 'Add a village first, then click it to expand and add unlimited subordinate local units. Changes sync immediately across all forms and filters.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[230px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={villageSearch}
                  onChange={(e) => setVillageSearch(e.target.value)}
                  placeholder={isRtl ? 'ابحث باسم القرية أو الوحدة المحلية...' : 'Search village or local unit...'}
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddVillageBox((v) => !v)}
                className="px-4 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addNewVillage')}</span>
              </button>
            </div>
          </div>

          {/* نموذج إضافة قرية جديدة السريع */}
          {showAddVillageBox && (
            <form
              onSubmit={handleAddVillage}
              className="p-4 rounded-2xl bg-[#F4F7FB] border-2 border-[#164E83]/40 flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-black text-[#102A43] block mb-1">
                  {t('villageNameLabel')} *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newVillageName}
                  onChange={(e) => setNewVillageName(e.target.value)}
                  placeholder={isRtl ? 'مثال: بشبيش، محلة حسن، صفط تراب...' : 'e.g. Bashbish, Mahalla Hassan...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#102A43]"
                />
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-black text-[#102A43] block mb-1">
                  {t('supplyAdminLabel')}
                </label>
                <input
                  type="text"
                  value={newVillageAdmin}
                  onChange={(e) => setNewVillageAdmin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#102A43]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'حفظ القرية' : 'Save Village'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddVillageBox(false)}
                  className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          )}

          {/* قائمة القرى التفاعلية القابلة للفتح والإغلاق مع الوحدات المحلية التابعة أسفل كل قرية */}
          {filteredVillages.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 space-y-2">
              <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-black text-[#102A43]">
                {isRtl ? 'لا توجد قرى مسجلة حالياً' : 'No villages registered yet'}
              </p>
              <button
                type="button"
                onClick={() => setShowAddVillageBox(true)}
                className="px-4 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addNewVillage')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredVillages.map((village) => {
                const isExpanded = Boolean(expandedVillageIds[village.id]);
                const activeUnitsCount = village.localUnits.filter((u) => u.isActive).length;
                const isEditingThisVillage = editingVillageId === village.id;

                return (
                  <div
                    key={village.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      village.isActive
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-200 bg-slate-50 opacity-80'
                    }`}
                  >
                    {/* صف القرية الرئيسي القابل للضغط والفتح/الإغلاق */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#F4F7FB]/80 hover:bg-blue-50/50 transition-colors">
                      <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
                        <button
                          type="button"
                          onClick={() => toggleVillageExpand(village.id)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#102A43] text-[#102A43] cursor-pointer shrink-0"
                          title={t('clickToExpandUnits')}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#164E83]" />
                          ) : isRtl ? (
                            <ChevronLeft className="w-4 h-4 text-[#164E83]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#164E83]" />
                          )}
                        </button>

                        {isEditingThisVillage ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editVillageNameDraft}
                              onChange={(e) => setEditVillageNameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveVillageEdit(village.id);
                                if (e.key === 'Escape') setEditingVillageId(null);
                              }}
                              autoFocus
                              className="px-2.5 py-1 rounded-lg border border-[#164E83] bg-white text-xs font-black text-[#102A43] flex-1 max-w-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveVillageEdit(village.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-black cursor-pointer"
                            >
                              {t('save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingVillageId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-black cursor-pointer"
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleVillageExpand(village.id)}
                            className="text-right flex flex-wrap items-center gap-2 cursor-pointer"
                          >
                            <span className="text-sm font-black text-[#102A43]">
                              {isRtl ? `القرية: ${village.villageName}` : `Village: ${village.villageName}`}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">·</span>
                            <span className="text-[11px] font-extrabold text-[#164E83] num-cell">
                              {fmtNum(activeUnitsCount)} / {fmtNum(village.localUnits.length)} {t('localUnitsCount')}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 hidden md:inline">·</span>
                            <span className="text-[11px] font-bold text-slate-600 hidden md:inline">
                              {village.supplyAdministration}
                            </span>
                            {!village.isActive && (
                              <span className="text-[10.5px] font-black text-red-700">
                                ({t('disabled')})
                              </span>
                            )}
                          </button>
                        )}
                      </div>

                      {/* أزرار إدارة القرية الواضحة والمنظمة */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedVillageIds((prev) => ({ ...prev, [village.id]: true }));
                            setAddingUnitForVillageId(village.id);
                            setNewUnitNameInput('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('addLocalUnit')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVillageId(village.id);
                            setEditVillageNameDraft(village.villageName);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{t('edit')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleVillageActive(village)}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black flex items-center gap-1 cursor-pointer ${
                            village.isActive
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                              : 'bg-blue-50 hover:bg-blue-100 text-[#164E83] border-blue-200'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{village.isActive ? t('disable') : t('enable')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVillage(village)}
                          className="px-2 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* قائمة الوحدات المحلية التابعة للقرية عند الفتح */}
                    {isExpanded && (
                      <div className="px-5 py-3.5 bg-white border-t border-slate-200 space-y-2.5">
                        {village.localUnits.length === 0 ? (
                          <p className="text-xs font-bold text-slate-500 py-1">
                            {t('noLocalUnitsYet')}
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {village.localUnits.map((unit, uIdx) => {
                              const isEditingThisUnit =
                                editingUnitKey?.villageId === village.id &&
                                editingUnitKey?.unitId === unit.id;
                              return (
                                <div
                                  key={unit.id}
                                  className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl border ${
                                    unit.isActive
                                      ? 'bg-slate-50/70 border-slate-200'
                                      : 'bg-slate-100 border-slate-200 opacity-70'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                    <CornerDownLeft className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                                    <span className="num-cell text-[11px] font-black text-slate-400">
                                      {fmtNum(uIdx + 1)}.
                                    </span>

                                    {isEditingThisUnit ? (
                                      <div className="flex items-center gap-1.5 flex-1">
                                        <input
                                          type="text"
                                          value={editUnitNameDraft}
                                          onChange={(e) => setEditUnitNameDraft(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveLocalUnitEdit(village.id, unit.id);
                                            if (e.key === 'Escape') setEditingUnitKey(null);
                                          }}
                                          autoFocus
                                          className="px-2.5 py-1 rounded-lg border border-[#164E83] bg-white text-xs font-black text-[#102A43] flex-1 max-w-sm"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveLocalUnitEdit(village.id, unit.id)}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-black cursor-pointer"
                                        >
                                          {t('save')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingUnitKey(null)}
                                          className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-black cursor-pointer"
                                        >
                                          {t('cancel')}
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-[#164E83] shrink-0" />
                                        <span className="text-xs font-black text-[#102A43]">
                                          {unit.name}
                                        </span>
                                        {!unit.isActive && (
                                          <span className="text-[10.5px] font-black text-red-700">
                                            ({t('disabled')})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUnitKey({ villageId: village.id, unitId: unit.id });
                                        setEditUnitNameDraft(unit.name);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10.5px] font-black cursor-pointer"
                                    >
                                      {t('edit')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLocalUnitActive(village.id, unit)}
                                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10.5px] font-black cursor-pointer"
                                    >
                                      {unit.isActive ? t('disable') : t('enable')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLocalUnit(village.id, unit)}
                                      className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10.5px] font-black cursor-pointer"
                                      title={t('delete')}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* شريط إضافة وحدة محلية جديدة تحت هذه القرية مباشرة */}
                        {addingUnitForVillageId === village.id ? (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <input
                              type="text"
                              autoFocus
                              value={newUnitNameInput}
                              onChange={(e) => setNewUnitNameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddLocalUnitToVillage(village.id);
                                }
                              }}
                              placeholder={
                                isRtl
                                  ? `اكتب اسم الوحدة المحلية الجديدة التابعة لقرية (${village.villageName})...`
                                  : `Enter new local unit under (${village.villageName})...`
                              }
                              className="flex-1 min-w-[240px] px-3 py-1.5 rounded-xl border border-[#164E83] bg-white text-xs font-bold text-[#102A43]"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddLocalUnitToVillage(village.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isRtl ? 'حفظ الوحدة المحلية' : 'Save Local Unit'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingUnitForVillageId(null);
                                setNewUnitNameInput('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-800 text-xs font-black cursor-pointer"
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAddingUnitForVillageId(village.id);
                              setNewUnitNameInput('');
                            }}
                            className="px-3 py-1.5 rounded-xl border border-dashed border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              + {t('addLocalUnit')} ({village.villageName})
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== التبويب ٢: إدارة القوائم المنسدلة الذكية (مجموعات منظمة) ==================== */}
      {activeTab === 'catalogs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* العمود الجانبي: مجموعات القوائم المنظمة + زر إضافة قائمة جديدة */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-[#102A43] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#164E83]" />
                <span>{t('selectListPrompt')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddGroupModal((v) => !v)}
                className="px-2.5 py-1 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[11px] font-black flex items-center gap-1 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{t('addNewListGroup')}</span>
              </button>
            </div>

            {showAddGroupModal && (
              <form
                onSubmit={handleCreateCustomGroup}
                className="p-3 rounded-xl bg-[#F4F7FB] border border-[#164E83]/30 space-y-2 text-xs"
              >
                <input
                  type="text"
                  required
                  value={newGroupTitleAr}
                  onChange={(e) => setNewGroupTitleAr(e.target.value)}
                  placeholder={isRtl ? 'اسم القائمة الجديدة بالعربية...' : 'New list title (Arabic)...'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
                <input
                  type="text"
                  value={newGroupTitleEn}
                  onChange={(e) => setNewGroupTitleEn(e.target.value)}
                  placeholder="English title (optional)..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder={isRtl ? 'وصف مختصر للقائمة...' : 'Short description...'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddGroupModal(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-black cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-black cursor-pointer"
                  >
                    {t('save')}
                  </button>
                </div>
              </form>
            )}

            {/* رابط مباشر لمجموعة القرى والوحدات المحلية */}
            <button
              type="button"
              onClick={() => setActiveTab('villages')}
              className="w-full px-3 py-2.5 rounded-xl border border-dashed border-[#C6A15B] bg-amber-50/60 hover:bg-amber-50 text-[#102A43] text-xs font-black flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#164E83]" />
                <span>{isRtl ? 'القرى والوحدات المحلية (التدرج الشجري)' : 'Villages & Local Units (Tree)'}</span>
              </span>
              <span className="num-cell text-[11px] font-black text-[#164E83]">
                {fmtNum(villages.length)}
              </span>
            </button>

            {/* قائمة المجموعات المنظمة */}
            <div className="space-y-1 max-h-[540px] overflow-y-auto compact-table-scroll">
              {groups.map((grp) => {
                const isSelected = grp.groupKey === selectedGroupKey;
                const count = groupItemCounts[grp.groupKey] || 0;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => {
                      setSelectedGroupKey(grp.groupKey);
                      setShowAddItemForm(false);
                      setEditingItemId(null);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-right flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#102A43] text-white border-[#102A43] shadow-xs'
                        : 'bg-slate-50/60 hover:bg-slate-100 text-[#102A43] border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-black leading-snug">
                      {isRtl ? grp.titleAr : grp.titleEn}
                    </span>
                    <span
                      className={`num-cell px-2 py-0.5 rounded-full text-[10.5px] font-black shrink-0 ${
                        isSelected ? 'bg-[#C6A15B] text-[#102A43]' : 'bg-white text-[#164E83] border border-slate-200'
                      }`}
                    >
                      {fmtNum(count)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* اللوحة الرئيسية لإدارة عناصر القائمة المختارة */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#102A43]">
                  {isRtl ? activeGroup?.titleAr : activeGroup?.titleEn}
                </h3>
                <p className="text-xs font-bold text-slate-600 mt-0.5">
                  {activeGroup?.descriptionAr} · {t('dragOrReorderHint')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemForm((v) => !v)}
                className="px-4 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addNewItem')}</span>
              </button>
            </div>

            {/* شريط البحث عن عنصر داخل القائمة */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder={isRtl ? 'ابحث عن أي عنصر بالاسم داخل القائمة...' : 'Search item by name...'}
                className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold"
              />
            </div>

            {/* نموذج إضافة عنصر جديد مع دعم العنصر الرئيسي */}
            {showAddItemForm && (
              <form
                onSubmit={handleAddCatalogItem}
                className="p-4 rounded-2xl bg-[#F4F7FB] border-2 border-[#164E83]/35 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
              >
                <div>
                  <label className="font-black text-[#102A43] block mb-1">
                    {isRtl ? 'اسم العنصر الجديد *' : 'New Item Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="font-black text-[#102A43] block mb-1">
                    {t('parentItemOptional')}
                  </label>
                  <select
                    value={newItemParentId}
                    onChange={(e) => setNewItemParentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="">{t('noParentRoot')}</option>
                    {catalogs
                      .filter((c) => c.groupKey === selectedGroupKey && !c.parentItemId)
                      .map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="font-black text-[#102A43] block mb-1">
                    {isRtl ? 'الجهة / البيان المرجعي' : 'Reference / Authority'}
                  </label>
                  <input
                    type="text"
                    value={newItemMeta}
                    onChange={(e) => setNewItemMeta(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddItemForm(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-200 text-slate-800 font-black cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{t('save')}</span>
                  </button>
                </div>
              </form>
            )}

            {/* قائمة العناصر مع السحب والإفلات + أزرار الترتيب + إظهار العناصر التابعة + التفعيل/التعطيل */}
            {itemsInSelectedGroup.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs font-bold">
                {isRtl ? 'لا توجد عناصر في هذه القائمة بعد — اضغط «إضافة عنصر جديد».' : 'No items yet — click "Add New Item".'}
              </div>
            ) : (
              <div className="space-y-2">
                {itemsInSelectedGroup.map((item, idx) => {
                  const parentObj = item.parentItemId
                    ? catalogs.find((p) => p.id === item.parentItemId)
                    : null;
                  const childItems = catalogs.filter((c) => c.parentItemId === item.id);
                  const isEditing = editingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedItemId(item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedItemId) reorderGroupItems(draggedItemId, item.id);
                        setDraggedItemId(null);
                      }}
                      className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 transition-all ${
                        item.isActive
                          ? 'bg-white border-slate-200 hover:border-[#164E83]'
                          : 'bg-slate-100 border-slate-200 opacity-75'
                      } ${parentObj ? (isRtl ? 'mr-6 border-r-2 border-r-[#C6A15B]' : 'ml-6 border-l-2 border-l-[#C6A15B]') : ''}`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
                        <span
                          className="text-slate-400 cursor-grab active:cursor-grabbing"
                          title={t('dragOrReorderHint')}
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span className="num-cell text-[11px] font-black text-slate-400 w-5 text-center">
                          {fmtNum(idx + 1)}
                        </span>

                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editItemLabelDraft}
                              onChange={(e) => setEditItemLabelDraft(e.target.value)}
                              className="px-2.5 py-1 rounded-lg border border-[#164E83] text-xs font-black flex-1 min-w-[160px]"
                            />
                            <input
                              type="text"
                              value={editItemMetaDraft}
                              onChange={(e) => setEditItemMetaDraft(e.target.value)}
                              placeholder={isRtl ? 'الجهة / البيان' : 'Meta'}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold flex-1 min-w-[140px]"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCatalogItemEdit(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-black cursor-pointer"
                            >
                              {t('save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-black cursor-pointer"
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {parentObj && (
                                <span className="text-[10.5px] font-black text-[#164E83]">
                                  {parentObj.label} ←
                                </span>
                              )}
                              <span className="text-xs font-black text-[#102A43]">{item.label}</span>
                              {childItems.length > 0 && (
                                <span className="text-[10.5px] font-extrabold text-emerald-700">
                                  ({fmtNum(childItems.length)} {isRtl ? 'عناصر فرعية' : 'sub-items'})
                                </span>
                              )}
                              {!item.isActive && (
                                <span className="text-[10.5px] font-black text-red-700">
                                  ({t('disabled')})
                                </span>
                              )}
                            </div>
                            {item.authorityOrMeta && (
                              <p className="text-[10.5px] font-bold text-slate-500 mt-0.5">
                                {item.authorityOrMeta}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveItemStep(item.id, 'up')}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"
                          title={isRtl ? 'تقديم لأعلى' : 'Move up'}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === itemsInSelectedGroup.length - 1}
                          onClick={() => moveItemStep(item.id, 'down')}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"
                          title={isRtl ? 'تأخير لأسفل' : 'Move down'}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setEditItemLabelDraft(item.label);
                            setEditItemMetaDraft(item.authorityOrMeta);
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10.5px] font-black cursor-pointer"
                        >
                          {t('edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCatalogItemActive(item)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[10.5px] font-black cursor-pointer"
                        >
                          {item.isActive ? t('disable') : t('enable')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCatalogItem(item)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== التبويب ٣: التراخيص والبطاقات الضريبية والسجلات بالتقويم العربي والترابط الذكي ==================== */}
      {activeTab === 'doc_expiries' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-[#102A43] flex items-center gap-1.5">
                <FileBadge2 className="w-4 h-4 text-[#164E83]" />
                <span>
                  {isRtl
                    ? 'إدارة تواريخ انتهاء التراخيص والبطاقات الضريبية والسجلات التجارية (ترابط تلقائي للقرى والوحدات)'
                    : 'Licenses, Tax Cards & Commercial Registers Expiry Manager'}
                </span>
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openAddDoc}
                className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isRtl ? 'إضافة سجل جديد' : 'Add Record'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportCsvUtf8Bom(
                    'master_licenses_tax_cr_expiries.csv',
                    [
                      'القسم',
                      'الكود',
                      'اسم المنشأة',
                      'صاحب النشاط',
                      'القرية',
                      'الوحدة المحلية',
                      'رقم الترخيص',
                      'انتهاء الترخيص',
                      'البطاقة الضريبية',
                      'انتهاء الضريبية',
                      'السجل التجاري',
                      'انتهاء السجل',
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
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('exportExcel')}</span>
              </button>
            </div>
          </div>

          {/* فلاتر مترابطة ذكياً: اختيار القرية يعرض الوحدات المحلية التابعة لها فقط */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder={isRtl ? 'بحث بالمنشأة أو التاجر أو الرقم...' : 'Search entity, owner, or number...'}
                className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold"
              />
            </div>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black"
            >
              <option value="ALL">{isRtl ? 'جميع الأقسام' : 'All Sections'}</option>
              <option value="المخابز البلدية">المخابز البلدية</option>
              <option value="التجارة الداخلية">التجارة الداخلية</option>
              <option value="السلع التموينية">السلع التموينية</option>
              <option value="البوتاجاز والوقود">البوتاجاز والوقود</option>
            </select>

            <select
              value={docVillageFilter}
              onChange={(e) => {
                setDocVillageFilter(e.target.value);
                setDocUnitFilter('ALL');
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black"
            >
              <option value="ALL">{isRtl ? 'جميع القرى المفعّلة' : 'All Active Villages'}</option>
              {activeVillageNamesList.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <select
              value={docUnitFilter}
              disabled={docVillageFilter === 'ALL'}
              onChange={(e) => setDocUnitFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 text-xs font-black"
            >
              <option value="ALL">
                {docVillageFilter === 'ALL'
                  ? isRtl
                    ? 'اختر القرية أولاً لعرض وحداتها المحلية'
                    : 'Select village first'
                  : isRtl
                  ? `جميع وحدات (${docVillageFilter})`
                  : `All units of (${docVillageFilter})`}
              </option>
              {cascadedUnitsForDocFilter.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <TableToolbar
            tableName={isRtl ? 'سجل التراخيص والبطاقات الضريبية والسجلات التجارية' : 'Licenses, Tax Cards & CR Registry'}
            totalRows={filteredDocs.length}
            pinnedCount={pinnedMode === 'manual' ? 2 : 0}
            onClearPins={() => setPinnedMode('none')}
            onManualPin={() => setPinnedMode('manual')}
          />

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className={`p-2 ${pinnedMode === 'manual' ? 'sticky right-0 z-10 bg-[#102A43]' : ''}`}>القسم</th>
                  <th className="p-2">اسم المنشأة / المخبز</th>
                  <th className="p-2">التاجر / المالك</th>
                  <th className="p-2">القرية والوحدة المحلية</th>
                  <th className="p-2">رقم الترخيص وانتهاؤه</th>
                  <th className="p-2">البطاقة الضريبية وانتهاؤها</th>
                  <th className="p-2">السجل التجاري وانتهاؤه</th>
                  <th className="p-2 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500 font-bold">
                      {isRtl ? 'لا توجد سجلات مطابقة.' : 'No matching records.'}
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((d) => (
                    <tr key={d.id} className="hover:bg-blue-50/40">
                      <td className={`p-2 font-black text-[#164E83] ${pinnedMode === 'manual' ? 'sticky right-0 bg-white' : ''}`}>
                        {d.sectionLabel}
                      </td>
                      <td className="p-2 font-black text-[#102A43]">{d.entityName}</td>
                      <td className="p-2 font-bold">{d.ownerName}</td>
                      <td className="p-2 font-bold">
                        <div>{d.village}</div>
                        <div className="text-[10px] text-slate-500">{d.localUnit}</div>
                      </td>
                      <td className="p-2 min-w-[165px] space-y-1">
                        <div className="num-cell font-black text-[#102A43]">{fmtNum(d.licenseNumber || '—')}</div>
                        <ChicArabicDatepicker
                          value={d.licenseExpiryDate}
                          onChange={(iso) => handleUpdateDocInlineDate(d.id, 'licenseExpiryDate', iso)}
                          todayRef={todayRef}
                          compact
                        />
                      </td>
                      <td className="p-2 min-w-[165px] space-y-1">
                        <div className="num-cell font-black text-[#102A43]">{fmtNum(d.taxCardNumber || '—')}</div>
                        <ChicArabicDatepicker
                          value={d.taxCardExpiryDate}
                          onChange={(iso) => handleUpdateDocInlineDate(d.id, 'taxCardExpiryDate', iso)}
                          todayRef={todayRef}
                          compact
                        />
                      </td>
                      <td className="p-2 min-w-[165px] space-y-1">
                        <div className="num-cell font-black text-[#102A43]">{fmtNum(d.commercialRegisterNumber || '—')}</div>
                        <ChicArabicDatepicker
                          value={d.commercialRegisterExpiryDate}
                          onChange={(iso) => handleUpdateDocInlineDate(d.id, 'commercialRegisterExpiryDate', iso)}
                          todayRef={todayRef}
                          compact
                        />
                      </td>
                      <td className="p-2 text-center">
                        <TableActionButtons
                          recordLabel={d.entityName}
                          onView={() =>
                            setCrudModal({
                              title: `استعراض سجل: ${d.entityName}`,
                              mode: 'view',
                              record: d as unknown as Record<string, unknown>,
                              fields: docFields,
                            })
                          }
                          onAdd={openAddDoc}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل سجل: ${d.entityName}`,
                              mode: 'edit',
                              record: d as unknown as Record<string, unknown>,
                              fields: docFields,
                              onSave: (u) => {
                                const updated = u as unknown as MasterDocumentExpiryEntry;
                                persistDocs(docExpiries.map((x) => (x.id === d.id ? updated : x)));
                                notify(isRtl ? `تم تحديث سجل (${updated.entityName}).` : 'Record updated.', 'success');
                              },
                            })
                          }
                          onDelete={() => {
                            persistDocs(docExpiries.filter((x) => x.id !== d.id));
                            notify(isRtl ? `تم حذف سجل (${d.entityName}).` : 'Record deleted.', 'info');
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

      {/* ==================== التبويب ٤: تخصيص رؤوس أعمدة الجداول ==================== */}
      {activeTab === 'table_headers' && activeTableRegistry && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43] flex items-center gap-1.5">
                <Columns3 className="w-4 h-4 text-[#164E83]" />
                <span>{isRtl ? 'تعديل عناوين ورؤوس أعمدة جميع جداول المنظومة' : 'Customize Table Column Headers'}</span>
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-[#102A43]"
              >
                {tableHeaders.map((tb) => (
                  <option key={tb.tableId} value={tb.tableId}>
                    {tb.sectionName} — {tb.tableName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setTableHeaders(INITIAL_MANAGED_TABLE_HEADERS);
                  saveManagedTableHeaders(INITIAL_MANAGED_TABLE_HEADERS);
                  notify(isRtl ? 'تمت استعادة العناوين الافتراضية لجميع الجداول.' : 'Default headers restored.', 'info');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRtl ? 'استعادة الافتراضي' : 'Restore Defaults'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTableRegistry.columns.map((col) => (
              <div key={col.key} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-bold text-slate-500">
                    {isRtl ? `الافتراضي: ${col.defaultLabel}` : `Default: ${col.defaultLabel}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteColumnFromTable(activeTableRegistry.tableId, col.key)}
                    className="p-1 rounded hover:bg-red-100 text-red-700 cursor-pointer"
                    title={t('delete')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={col.customLabel}
                  onChange={(e) =>
                    handleUpdateColumnHeader(activeTableRegistry.tableId, col.key, e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-black text-[#102A43]"
                />
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-[#F4F7FB] border border-slate-200 flex flex-wrap items-end gap-2.5 text-xs">
            <div className="flex-1 min-w-[200px]">
              <label className="font-black text-[#102A43] block mb-1">
                {isRtl ? 'إضافة عمود جديد لهذا الجدول' : 'Add Custom Column Label'}
              </label>
              <input
                type="text"
                value={newColLabel}
                onChange={(e) => setNewColLabel(e.target.value)}
                placeholder={isRtl ? 'عنوان العمود الجديد...' : 'Column label...'}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
              />
            </div>
            <div className="w-44">
              <label className="font-black text-[#102A43] block mb-1">
                {isRtl ? 'المعرف البرمجي (اختياري)' : 'Key (Optional)'}
              </label>
              <input
                type="text"
                value={newColKey}
                onChange={(e) => setNewColKey(e.target.value)}
                placeholder="custom_field"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-mono text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleAddColumnToTable}
              className="px-4 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('add')}</span>
            </button>
          </div>
        </div>
      )}

      {/* نافذة العرض / التعديل الموحدة */}
      {crudModal && (
        <UniversalCrudModal
          mode={crudModal.mode}
          title={crudModal.title}
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
