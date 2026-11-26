'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  PackageCheck,
  Plus,
  Search,
  Upload,
  Users,
  Warehouse,
} from 'lucide-react';
import {
  CitizenIssueTransactionRecord,
  RationCardRecord,
  RationCommodityRecord,
  RationMerchantRecord,
  RationWarehouseRecord,
  VillageBeneficiaryStatRecord,
  WarehouseLedgerMovementRecord,
  WarehousePurchaseReceiptRecord,
  WarehouseStocktakeRecord,
  WarehouseTransferRecord,
  computeLedgerClosingBalance,
  maskNationalIdOrCard,
} from '@/lib/ration-commodities-store';
import { MAHALLA_LOCAL_UNITS, MAHALLA_VILLAGES } from '@/lib/bakery-math';
import { formatArabicCurrency, formatArabicNumber, formatDateArabic, toArabicNumerals } from '@/lib/utils';
import TableToolbar from '../TableToolbar';
import {
  EditableFieldSpec,
  TableActionButtons,
  UniversalCrudModal,
} from '../trade/TradeSharedCrudUi';

export type RationWarehouseCardsScreenKey =
  | 'warehouses_purchases'
  | 'ration_cards'
  | 'beneficiaries_db'
  | 'citizen_issues';

interface RationWarehouseAndCardsViewProps {
  activeScreen: RationWarehouseCardsScreenKey;
  todayRef: string;
  currentUserName: string;
  maskSensitiveByDefault: boolean;
  commodities: RationCommodityRecord[];
  merchants: RationMerchantRecord[];
  warehouses: RationWarehouseRecord[];
  setWarehouses: (next: RationWarehouseRecord[]) => void;
  receipts: WarehousePurchaseReceiptRecord[];
  setReceipts: (next: WarehousePurchaseReceiptRecord[]) => void;
  ledger: WarehouseLedgerMovementRecord[];
  setLedger: (next: WarehouseLedgerMovementRecord[]) => void;
  transfers: WarehouseTransferRecord[];
  setTransfers: (next: WarehouseTransferRecord[]) => void;
  stocktakes: WarehouseStocktakeRecord[];
  setStocktakes: (next: WarehouseStocktakeRecord[]) => void;
  cards: RationCardRecord[];
  setCards: (next: RationCardRecord[]) => void;
  beneficiaryStats: VillageBeneficiaryStatRecord[];
  setBeneficiaryStats: (next: VillageBeneficiaryStatRecord[]) => void;
  citizenIssues: CitizenIssueTransactionRecord[];
  setCitizenIssues: (next: CitizenIssueTransactionRecord[]) => void;
  onLogAudit: (screen: string, actionType: 'إضافة' | 'تعديل' | 'حذف' | 'قيد عكسي' | 'اعتماد', details: string) => void;
  onNotify: (msg: string) => void;
}

export default function RationWarehouseAndCardsView({
  activeScreen,
  todayRef,
  currentUserName,
  maskSensitiveByDefault,
  commodities,
  merchants,
  warehouses,
  setWarehouses,
  receipts,
  setReceipts,
  ledger,
  setLedger,
  transfers,
  setTransfers,
  stocktakes,
  setStocktakes,
  cards,
  setCards,
  beneficiaryStats,
  setBeneficiaryStats,
  citizenIssues,
  setCitizenIssues,
  onLogAudit,
  onNotify,
}: RationWarehouseAndCardsViewProps) {
  const [whSubTab, setWhSubTab] = useState<'warehouses' | 'purchases' | 'ledger' | 'transfers' | 'stocktakes'>('warehouses');
  const [searchTerm, setSearchTerm] = useState('');
  const [cardStatusFilter, setCardStatusFilter] = useState('ALL');
  const [showFullSensitive, setShowFullSensitive] = useState(!maskSensitiveByDefault);
  const [selectedYearFilter, setSelectedYearFilter] = useState<number>(2025);
  const [newYearInput, setNewYearInput] = useState<number>(2026);
  const [pinnedMode, setPinnedMode] = useState<'none' | 'manual'>('none');

  const [crudModal, setCrudModal] = useState<{
    title: string;
    mode: 'view' | 'edit';
    record: Record<string, unknown>;
    fields: EditableFieldSpec[];
    onSave?: (updated: Record<string, unknown>) => void;
  } | null>(null);

  const availableYears = useMemo(() => {
    const yrs = new Set<number>([2023, 2024, 2025]);
    beneficiaryStats.forEach((v) => v.yearlySnapshots.forEach((s) => yrs.add(s.year)));
    return Array.from(yrs).sort((a, b) => a - b);
  }, [beneficiaryStats]);

  // ==================== الشاشة ٥: إدارة المخازن والمشتريات (٥ تبويبات فرعية) ====================
  if (activeScreen === 'warehouses_purchases') {
    const warehouseFields: EditableFieldSpec[] = [
      { key: 'warehouseCode', label: 'كود المخزن' },
      { key: 'warehouseName', label: 'اسم المخزن' },
      { key: 'supplyAdministration', label: 'الإدارة التموينية' },
      { key: 'village', label: 'القرية', type: 'select', options: MAHALLA_VILLAGES },
      { key: 'localUnit', label: 'الوحدة المحلية', type: 'select', options: MAHALLA_LOCAL_UNITS },
      { key: 'managerName', label: 'أمين / مدير المخزن' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'capacityTons', label: 'السعة التخزينية (طن)', type: 'number' },
      { key: 'currentOccupancyTons', label: 'الإشغال الحالي (طن)', type: 'number' },
      { key: 'licenseNumber', label: 'رقم الترخيص' },
      { key: 'licenseExpiryDate', label: 'انتهاء الترخيص', type: 'date' },
      { key: 'taxCardNumber', label: 'رقم البطاقة الضريبية' },
      { key: 'taxCardExpiryDate', label: 'انتهاء البطاقة الضريبية', type: 'date' },
      { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري' },
      { key: 'commercialRegisterExpiryDate', label: 'انتهاء السجل التجاري', type: 'date' },
      { key: 'status', label: 'حالة المخزن', type: 'select', options: ['نشط', 'صيانة', 'مغلق'] },
    ];

    const receiptFields: EditableFieldSpec[] = [
      { key: 'receiptNumber', label: 'رقم إذن الاستلام' },
      { key: 'receiptDate', label: 'تاريخ الاستلام', type: 'date' },
      { key: 'warehouseName', label: 'المخزن المستلم', type: 'select', options: warehouses.length ? warehouses.map((w) => w.warehouseName) : ['مخزن الجملة الرئيسي'] },
      { key: 'supplierName', label: 'الجهة الموردة' },
      { key: 'commodityName', label: 'السلعة', type: 'select', options: commodities.length ? commodities.map((c) => c.commodityName) : ['سكر معبأ تمويني ١ كجم'] },
      { key: 'unit', label: 'الوحدة' },
      { key: 'quantityReceived', label: 'الكمية المستلمة', type: 'number' },
      { key: 'unitCostEgp', label: 'سعر الوحدة (ج.م)', type: 'number' },
      { key: 'batchNumber', label: 'رقم التشغيلة' },
      { key: 'expiryDate', label: 'تاريخ الصلاحية', type: 'date' },
      { key: 'approvalStatus', label: 'حالة الاعتماد', type: 'select', options: ['مسودة', 'معتمد', 'ملغى بقيد عكسي'] },
    ];

    const ledgerFields: EditableFieldSpec[] = [
      { key: 'movementNumber', label: 'رقم قيد الحركة' },
      { key: 'movementDate', label: 'تاريخ الحركة', type: 'date' },
      { key: 'warehouseName', label: 'المخزن', type: 'select', options: warehouses.length ? warehouses.map((w) => w.warehouseName) : ['مخزن الجملة الرئيسي'] },
      { key: 'commodityName', label: 'السلعة', type: 'select', options: commodities.length ? commodities.map((c) => c.commodityName) : ['سكر معبأ تمويني ١ كجم'] },
      { key: 'unit', label: 'الوحدة' },
      { key: 'openingBalance', label: 'الرصيد الافتتاحي', type: 'number' },
      { key: 'incomingQty', label: 'الوارد (+)', type: 'number' },
      { key: 'transfersInQty', label: 'تحويلات واردة (+)', type: 'number' },
      { key: 'returnsQty', label: 'مرتجعات (+)', type: 'number' },
      { key: 'dispensedQty', label: 'المنصرف (-)', type: 'number' },
      { key: 'transfersOutQty', label: 'تحويلات صادرة (-)', type: 'number' },
      { key: 'damagedQty', label: 'التالف (-)', type: 'number' },
      { key: 'adjustmentsQty', label: 'التسويات (-)', type: 'number' },
      { key: 'computedClosingBalance', label: 'الرصيد الختامي الآلي (محسوب تلقائياً)', type: 'number', readOnly: true },
      { key: 'referenceDocNumber', label: 'المستند المرجعي' },
    ];

    const transferFields: EditableFieldSpec[] = [
      { key: 'transferNumber', label: 'رقم إذن التحويل' },
      { key: 'transferDate', label: 'تاريخ التحويل', type: 'date' },
      { key: 'fromWarehouseName', label: 'من مخزن', type: 'select', options: warehouses.length ? warehouses.map((w) => w.warehouseName) : ['مخزن الجملة الرئيسي'] },
      { key: 'toWarehouseName', label: 'إلى مخزن', type: 'select', options: warehouses.length ? warehouses.map((w) => w.warehouseName) : ['مخزن دمرو'] },
      { key: 'commodityName', label: 'السلعة', type: 'select', options: commodities.length ? commodities.map((c) => c.commodityName) : ['سكر معبأ تمويني ١ كجم'] },
      { key: 'unit', label: 'الوحدة' },
      { key: 'quantity', label: 'الكمية المحولة', type: 'number' },
      { key: 'driverOrCarrier', label: 'بيانات السيارة / السائق' },
      { key: 'approvalStatus', label: 'حالة الاعتماد', type: 'select', options: ['بانتظار الاعتماد', 'معتمد ومستلم', 'مرفوض'] },
    ];

    const stocktakeFields: EditableFieldSpec[] = [
      { key: 'stocktakeNumber', label: 'رقم محضر الجرد' },
      { key: 'stocktakeDate', label: 'تاريخ الجرد', type: 'date' },
      { key: 'warehouseName', label: 'المخزن', type: 'select', options: warehouses.length ? warehouses.map((w) => w.warehouseName) : ['مخزن الجملة الرئيسي'] },
      { key: 'commodityName', label: 'السلعة', type: 'select', options: commodities.length ? commodities.map((c) => c.commodityName) : ['سكر معبأ تمويني ١ كجم'] },
      { key: 'unit', label: 'الوحدة' },
      { key: 'bookBalance', label: 'الرصيد الدفتري', type: 'number' },
      { key: 'actualPhysicalCount', label: 'الجرد الفعلي', type: 'number' },
      { key: 'varianceQty', label: 'الفرق (الفعلي - الدفتري) آلي', type: 'number', readOnly: true },
      { key: 'committeeChair', label: 'رئيس لجنة الجرد' },
      { key: 'notes', label: 'ملاحظات اللجنة' },
    ];

    const openAddWarehouse = () => {
      const rec: RationWarehouseRecord = {
        id: `rw-${Date.now()}`,
        warehouseCode: `WH-RAT-${String(warehouses.length + 1).padStart(2, '0')}`,
        warehouseName: '',
        supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
        village: MAHALLA_VILLAGES[0],
        localUnit: MAHALLA_LOCAL_UNITS[0],
        managerName: '',
        phone: '',
        capacityTons: 500,
        currentOccupancyTons: 0,
        licenseNumber: '',
        licenseExpiryDate: '2028-11-25',
        taxCardNumber: '',
        taxCardExpiryDate: '2028-11-25',
        commercialRegisterNumber: '',
        commercialRegisterExpiryDate: '2028-11-25',
        status: 'نشط',
      };
      setCrudModal({
        title: 'إضافة مخزن تمويني جديد',
        mode: 'edit',
        record: rec as unknown as Record<string, unknown>,
        fields: warehouseFields,
        onSave: (u) => {
          const item = u as unknown as RationWarehouseRecord;
          setWarehouses([item, ...warehouses]);
          onLogAudit('إدارة المخازن', 'إضافة', `إضافة المخزن (${item.warehouseName})`);
          onNotify('تمت إضافة المخزن الجديد وحفظ بيانات التراخيص والسجلات.');
        },
      });
    };

    const openAddReceipt = () => {
      const rec: WarehousePurchaseReceiptRecord = {
        id: `wpr-${Date.now()}`,
        receiptNumber: `REC-2026-${900 + receipts.length + 1}`,
        receiptDate: todayRef,
        warehouseId: warehouses[0]?.id || 'rw-1',
        warehouseName: warehouses[0]?.warehouseName || 'مخزن الجملة الرئيسي',
        supplierName: 'الشركة العامة لتجارة الجملة',
        commodityId: commodities[0]?.id || 'rc-1',
        commodityName: commodities[0]?.commodityName || 'سكر معبأ تمويني ١ كجم',
        unit: commodities[0]?.unit || 'كيس ١ كجم',
        quantityReceived: 1000,
        unitCostEgp: 12.1,
        totalValueEgp: 12100,
        batchNumber: `BCH-${Date.now().toString().slice(-4)}`,
        expiryDate: '2028-11-01',
        approvalStatus: 'مسودة',
        recordedBy: currentUserName,
      };
      setCrudModal({
        title: 'تسجيل إذن استلام ومشتريات جديد',
        mode: 'edit',
        record: rec as unknown as Record<string, unknown>,
        fields: receiptFields,
        onSave: (u) => {
          const raw = u as unknown as WarehousePurchaseReceiptRecord;
          const item: WarehousePurchaseReceiptRecord = {
            ...raw,
            totalValueEgp: Number((Number(raw.quantityReceived) * Number(raw.unitCostEgp)).toFixed(2)),
          };
          setReceipts([item, ...receipts]);
          onLogAudit('المشتريات والتوريدات', 'إضافة', `إضافة إذن استلام ${item.receiptNumber}`);
          onNotify('تم تسجيل إذن الاستلام وحساب القيمة الإجمالية تلقائياً.');
        },
      });
    };

    const openAddLedger = () => {
      const rec: WarehouseLedgerMovementRecord = {
        id: `wlm-${Date.now()}`,
        movementNumber: `MOV-2026-${500 + ledger.length + 1}`,
        movementDate: todayRef,
        warehouseId: warehouses[0]?.id || 'rw-1',
        warehouseName: warehouses[0]?.warehouseName || 'مخزن الجملة الرئيسي',
        commodityId: commodities[0]?.id || 'rc-1',
        commodityName: commodities[0]?.commodityName || 'سكر معبأ تمويني ١ كجم',
        unit: commodities[0]?.unit || 'كيس ١ كجم',
        openingBalance: 1000,
        incomingQty: 500,
        transfersInQty: 0,
        returnsQty: 0,
        dispensedQty: 400,
        transfersOutQty: 0,
        damagedQty: 0,
        adjustmentsQty: 0,
        computedClosingBalance: 1100,
        referenceDocNumber: '',
        approvalStatus: 'معتمد',
        recordedBy: currentUserName,
      };
      setCrudModal({
        title: 'قيد حركة مخزنية جديدة (الرصيد يُحسب آلياً)',
        mode: 'edit',
        record: rec as unknown as Record<string, unknown>,
        fields: ledgerFields,
        onSave: (u) => {
          const raw = u as unknown as WarehouseLedgerMovementRecord;
          const computedClosingBalance = computeLedgerClosingBalance({
            openingBalance: Number(raw.openingBalance) || 0,
            incomingQty: Number(raw.incomingQty) || 0,
            transfersInQty: Number(raw.transfersInQty) || 0,
            returnsQty: Number(raw.returnsQty) || 0,
            dispensedQty: Number(raw.dispensedQty) || 0,
            transfersOutQty: Number(raw.transfersOutQty) || 0,
            damagedQty: Number(raw.damagedQty) || 0,
            adjustmentsQty: Number(raw.adjustmentsQty) || 0,
          });
          const item: WarehouseLedgerMovementRecord = { ...raw, computedClosingBalance };
          setLedger([item, ...ledger]);
          onLogAudit('دفتر حركة المخازن', 'إضافة', `قيد حركة ${item.movementNumber} برصيد آلي ${computedClosingBalance}`);
          onNotify(`تم حفظ الحركة واحتساب الرصيد الختامي آلياً (${toArabicNumerals(computedClosingBalance)}).`);
        },
      });
    };

    const openAddTransfer = () => {
      const rec: WarehouseTransferRecord = {
        id: `wt-${Date.now()}`,
        transferNumber: `TRF-2026-${300 + transfers.length + 1}`,
        transferDate: todayRef,
        fromWarehouseName: warehouses[0]?.warehouseName || 'مخزن الجملة الرئيسي',
        toWarehouseName: warehouses[1]?.warehouseName || 'مخزن دمرو',
        commodityName: commodities[0]?.commodityName || 'سكر معبأ تمويني ١ كجم',
        unit: commodities[0]?.unit || 'كيس ١ كجم',
        quantity: 500,
        driverOrCarrier: '',
        approvalStatus: 'بانتظار الاعتماد',
        approvedBy: '—',
      };
      setCrudModal({
        title: 'إنشاء طلب تحويل بضاعة بين المخازن',
        mode: 'edit',
        record: rec as unknown as Record<string, unknown>,
        fields: transferFields,
        onSave: (u) => {
          const item = u as unknown as WarehouseTransferRecord;
          setTransfers([item, ...transfers]);
          onLogAudit('التحويل بين المخازن', 'إضافة', `طلب تحويل ${item.transferNumber}`);
          onNotify('تم إنشاء إذن التحويل بين المخازن (يتطلب الاعتماد للتنفيذ).');
        },
      });
    };

    const openAddStocktake = () => {
      const rec: WarehouseStocktakeRecord = {
        id: `ws-${Date.now()}`,
        stocktakeNumber: `STK-2026-11-${String(stocktakes.length + 1).padStart(2, '0')}`,
        stocktakeDate: todayRef,
        warehouseName: warehouses[0]?.warehouseName || 'مخزن الجملة الرئيسي',
        commodityName: commodities[0]?.commodityName || 'سكر معبأ تمويني ١ كجم',
        unit: commodities[0]?.unit || 'كيس ١ كجم',
        bookBalance: 1000,
        actualPhysicalCount: 1000,
        varianceQty: 0,
        committeeChair: currentUserName,
        status: 'مطابق',
        notes: '',
      };
      setCrudModal({
        title: 'تسجيل محضر جرد ومطابقة مخزنية',
        mode: 'edit',
        record: rec as unknown as Record<string, unknown>,
        fields: stocktakeFields,
        onSave: (u) => {
          const raw = u as unknown as WarehouseStocktakeRecord;
          const varianceQty = Number(((Number(raw.actualPhysicalCount) || 0) - (Number(raw.bookBalance) || 0)).toFixed(2));
          const status: WarehouseStocktakeRecord['status'] =
            varianceQty === 0 ? 'مطابق' : varianceQty < 0 ? 'عجز يستوجب المساءلة' : 'زيادة دفتريه';
          const item: WarehouseStocktakeRecord = { ...raw, varianceQty, status };
          setStocktakes([item, ...stocktakes]);
          onLogAudit('الجرد والمطابقة', 'إضافة', `محضر جرد ${item.stocktakeNumber} (فرق: ${varianceQty})`);
          onNotify('تم تسجيل محضر الجرد وحساب الفرق بين الفعلي والدفتري تلقائياً.');
        },
      });
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ٥. إدارة المخازن والمشتريات ودفتر الحركة الآلي والتحويلات والجرد والمطابقة
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                الرصيد الختامي يُحسب تلقائياً بالمعادلة القانونية ولا يُعدل يدوياً · الحركات المعتمدة محمية من الحذف وتُعالج بقيد عكسي موثق
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'warehouses' as const, label: 'سجل المخازن', count: warehouses.length, icon: Warehouse },
                { id: 'purchases' as const, label: 'المشتريات والتوريدات', count: receipts.length, icon: PackageCheck },
                { id: 'ledger' as const, label: 'دفتر حركة المخازن', count: ledger.length, icon: FileSpreadsheet },
                { id: 'transfers' as const, label: 'التحويل بين المخازن', count: transfers.length, icon: ArrowLeftRight },
                { id: 'stocktakes' as const, label: 'الجرد والمطابقة', count: stocktakes.length, icon: ClipboardCheck },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setWhSubTab(t.id)}
                    className={`px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 cursor-pointer transition-colors ${
                      whSubTab === t.id
                        ? 'bg-[#102A43] text-[#C6A15B]'
                        : 'bg-slate-100 hover:bg-slate-200 text-[#102A43]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                    <span className="num-cell opacity-80">({toArabicNumerals(t.count)})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ٥.١ سجل المخازن */}
        {whSubTab === 'warehouses' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <TableToolbar
                tableName="سجل المخازن التموينية"
                totalRows={warehouses.length}
                pinnedCount={pinnedMode === 'manual' ? 1 : 0}
                onClearPins={() => setPinnedMode('none')}
                onManualPin={() => setPinnedMode('manual')}
              />
              <button
                type="button"
                onClick={openAddWarehouse}
                className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 mr-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مخزن</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">الكود / اسم المخزن</th>
                    <th className="p-2.5 border border-slate-700">القرية / أمين المخزن</th>
                    <th className="p-2.5 border border-slate-700 text-center">السعة / الإشغال (طن)</th>
                    <th className="p-2.5 border border-slate-700">الترخيص وانتهاؤه</th>
                    <th className="p-2.5 border border-slate-700">البطاقة الضريبية وانتهاؤها</th>
                    <th className="p-2.5 border border-slate-700">السجل التجاري وانتهاؤه</th>
                    <th className="p-2.5 border border-slate-700 text-center">الحالة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map((w) => (
                    <tr key={w.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5">
                        <span className="num-cell font-black text-[#164E83] block">{w.warehouseCode}</span>
                        <span className="font-black text-[#102A43]">{w.warehouseName}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-bold text-slate-800 block">{w.village}</span>
                        <span className="text-[11px] text-slate-500 font-bold">{w.managerName}</span>
                      </td>
                      <td className="p-2.5 text-center num-cell font-black">
                        {formatArabicNumber(w.currentOccupancyTons)} / {formatArabicNumber(w.capacityTons)}
                      </td>
                      <td className="p-2.5 num-cell">
                        <span className="font-black block">{w.licenseNumber}</span>
                        <span className={`text-[10.5px] font-bold ${w.licenseExpiryDate < todayRef ? 'text-red-700' : 'text-slate-600'}`}>
                          ينتهي: {formatDateArabic(w.licenseExpiryDate)}
                        </span>
                      </td>
                      <td className="p-2.5 num-cell">
                        <span className="font-black block">{w.taxCardNumber}</span>
                        <span className="text-[10.5px] font-bold text-slate-600">ينتهي: {formatDateArabic(w.taxCardExpiryDate)}</span>
                      </td>
                      <td className="p-2.5 num-cell">
                        <span className="font-black block">{w.commercialRegisterNumber}</span>
                        <span className="text-[10.5px] font-bold text-slate-600">ينتهي: {formatDateArabic(w.commercialRegisterExpiryDate)}</span>
                      </td>
                      <td className="p-2.5 text-center font-black text-emerald-700">{w.status}</td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          recordLabel={w.warehouseName}
                          onView={() => setCrudModal({ title: `بيانات المخزن: ${w.warehouseName}`, mode: 'view', record: w as unknown as Record<string, unknown>, fields: warehouseFields })}
                          onAdd={openAddWarehouse}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل المخزن: ${w.warehouseName}`,
                              mode: 'edit',
                              record: w as unknown as Record<string, unknown>,
                              fields: warehouseFields,
                              onSave: (u) => {
                                setWarehouses(warehouses.map((x) => (x.id === w.id ? (u as unknown as RationWarehouseRecord) : x)));
                                onLogAudit('إدارة المخازن', 'تعديل', `تحديث بيانات المخزن ${w.warehouseName}`);
                                onNotify('تم تحديث بيانات المخزن.');
                              },
                            })
                          }
                          onDelete={() => {
                            setWarehouses(warehouses.filter((x) => x.id !== w.id));
                            onLogAudit('إدارة المخازن', 'حذف', `حذف المخزن ${w.warehouseName}`);
                            onNotify('تم حذف المخزن.');
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ٥.٢ المشتريات والتوريدات */}
        {whSubTab === 'purchases' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openAddReceipt}
                className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة إذن استلام ومشتريات</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">رقم الإذن / التاريخ</th>
                    <th className="p-2.5 border border-slate-700">المخزن والمورد</th>
                    <th className="p-2.5 border border-slate-700">السلعة والتشغيلة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الكمية المستلمة</th>
                    <th className="p-2.5 border border-slate-700 text-center">القيمة الإجمالية</th>
                    <th className="p-2.5 border border-slate-700 text-center">الصلاحية / الاعتماد</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 num-cell">
                        <span className="font-black text-[#164E83] block">{r.receiptNumber}</span>
                        <span className="text-[11px] font-bold text-slate-600">{formatDateArabic(r.receiptDate)}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-black text-[#102A43] block">{r.warehouseName}</span>
                        <span className="text-[11px] font-bold text-slate-600">{r.supplierName}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-black text-[#102A43] block">{r.commodityName}</span>
                        <span className="text-[11px] font-bold text-slate-500">تشغيلة: {r.batchNumber}</span>
                      </td>
                      <td className="p-2.5 text-center num-cell font-black">
                        {formatArabicNumber(r.quantityReceived)} {r.unit}
                      </td>
                      <td className="p-2.5 text-center num-cell font-black text-emerald-800">
                        {formatArabicCurrency(r.totalValueEgp)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="num-cell text-[10.5px] font-bold block">{formatDateArabic(r.expiryDate)}</span>
                        <span className={`font-black text-[11px] ${r.approvalStatus === 'معتمد' ? 'text-emerald-700' : r.approvalStatus === 'ملغى بقيد عكسي' ? 'text-red-700' : 'text-amber-700'}`}>
                          {r.approvalStatus}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          recordLabel={r.receiptNumber}
                          isApprovedImmutable={r.approvalStatus === 'معتمد'}
                          onReverseOrCancel={() => {
                            setReceipts(receipts.map((x) => (x.id === r.id ? { ...x, approvalStatus: 'ملغى بقيد عكسي' } : x)));
                            onLogAudit('المشتريات والتوريدات', 'قيد عكسي', `تسجيل قيد عكسي لإذن الاستلام المعتمد ${r.receiptNumber}`);
                            onNotify(`تم تسجيل قيد عكسي موثق لإذن الاستلام (${r.receiptNumber}).`);
                          }}
                          onView={() => setCrudModal({ title: `إذن استلام: ${r.receiptNumber}`, mode: 'view', record: r as unknown as Record<string, unknown>, fields: receiptFields })}
                          onAdd={openAddReceipt}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل إذن الاستلام: ${r.receiptNumber}`,
                              mode: 'edit',
                              record: r as unknown as Record<string, unknown>,
                              fields: receiptFields,
                              onSave: (u) => {
                                const raw = u as unknown as WarehousePurchaseReceiptRecord;
                                const updated = { ...raw, totalValueEgp: Number((Number(raw.quantityReceived) * Number(raw.unitCostEgp)).toFixed(2)) };
                                setReceipts(receipts.map((x) => (x.id === r.id ? updated : x)));
                                onLogAudit('المشتريات والتوريدات', 'تعديل', `تحديث إذن الاستلام ${r.receiptNumber}`);
                                onNotify('تم تحديث إذن الاستلام.');
                              },
                            })
                          }
                          onDelete={() => {
                            setReceipts(receipts.filter((x) => x.id !== r.id));
                            onLogAudit('المشتريات والتوريدات', 'حذف', `حذف مسودة إذن ${r.receiptNumber}`);
                            onNotify('تم حذف مسودة إذن الاستلام.');
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ٥.٣ دفتر حركة المخازن (رصيد آلي غير قابل للتعديل اليدوي) */}
        {whSubTab === 'ledger' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-black text-[#164E83] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                المعادلة الآلية للرصيد = الافتتاحي + الوارد + التحويلات الواردة + المرتجعات - المنصرف - التحويلات الصادرة - التالف - التسويات
              </div>
              <button
                type="button"
                onClick={openAddLedger}
                className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>قيد حركة مخزنية جديدة</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-700">القيد / التاريخ</th>
                    <th className="p-2 border border-slate-700">المخزن والسلعة</th>
                    <th className="p-2 border border-slate-700 text-center">افتتاحي</th>
                    <th className="p-2 border border-slate-700 text-center">وارد (+)</th>
                    <th className="p-2 border border-slate-700 text-center">تحويل وارد / مرتجع (+)</th>
                    <th className="p-2 border border-slate-700 text-center">منصرف (-)</th>
                    <th className="p-2 border border-slate-700 text-center">تحويل صادر / تالف (-)</th>
                    <th className="p-2 border border-slate-700 text-center bg-[#164E83]">الرصيد الختامي الآلي</th>
                    <th className="p-2 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((m) => (
                    <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 num-cell">
                        <span className="font-black text-[#164E83] block">{m.movementNumber}</span>
                        <span className="text-[10.5px] font-bold text-slate-600">{formatDateArabic(m.movementDate)}</span>
                      </td>
                      <td className="p-2">
                        <span className="font-black text-[#102A43] block">{m.commodityName}</span>
                        <span className="text-[10.5px] font-bold text-slate-500">{m.warehouseName}</span>
                      </td>
                      <td className="p-2 text-center num-cell font-bold">{formatArabicNumber(m.openingBalance)}</td>
                      <td className="p-2 text-center num-cell font-black text-emerald-700">+{formatArabicNumber(m.incomingQty)}</td>
                      <td className="p-2 text-center num-cell font-bold text-emerald-700">
                        +{formatArabicNumber(m.transfersInQty + m.returnsQty)}
                      </td>
                      <td className="p-2 text-center num-cell font-black text-red-700">-{formatArabicNumber(m.dispensedQty)}</td>
                      <td className="p-2 text-center num-cell font-bold text-red-700">
                        -{formatArabicNumber(m.transfersOutQty + m.damagedQty + m.adjustmentsQty)}
                      </td>
                      <td className="p-2 text-center num-cell font-black text-[#102A43] bg-blue-50/70">
                        {formatArabicNumber(m.computedClosingBalance)} {m.unit}
                      </td>
                      <td className="p-2 text-center">
                        <TableActionButtons
                          recordLabel={m.movementNumber}
                          isApprovedImmutable={m.approvalStatus === 'معتمد'}
                          onReverseOrCancel={() => {
                            const reversed: WarehouseLedgerMovementRecord = {
                              ...m,
                              id: `wlm-rev-${Date.now()}`,
                              movementNumber: `REV-${m.movementNumber}`,
                              movementDate: todayRef,
                              openingBalance: m.computedClosingBalance,
                              incomingQty: m.dispensedQty,
                              transfersInQty: 0,
                              returnsQty: 0,
                              dispensedQty: m.incomingQty,
                              transfersOutQty: 0,
                              damagedQty: 0,
                              adjustmentsQty: 0,
                              computedClosingBalance: m.openingBalance,
                              referenceDocNumber: `قيد عكسي لـ ${m.movementNumber}`,
                              approvalStatus: 'قيد عكسي',
                              recordedBy: currentUserName,
                            };
                            setLedger([reversed, ...ledger]);
                            onLogAudit('دفتر حركة المخازن', 'قيد عكسي', `إنشاء قيد عكسي للحركة المعتمدة ${m.movementNumber}`);
                            onNotify(`تم إصدار قيد عكسي رسمي (${reversed.movementNumber}) دون حذف القيد الأصلي.`);
                          }}
                          onView={() => setCrudModal({ title: `حركة مخزنية: ${m.movementNumber}`, mode: 'view', record: m as unknown as Record<string, unknown>, fields: ledgerFields })}
                          onAdd={openAddLedger}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل حركة: ${m.movementNumber}`,
                              mode: 'edit',
                              record: m as unknown as Record<string, unknown>,
                              fields: ledgerFields,
                              onSave: (u) => {
                                const raw = u as unknown as WarehouseLedgerMovementRecord;
                                const computedClosingBalance = computeLedgerClosingBalance({
                                  openingBalance: Number(raw.openingBalance) || 0,
                                  incomingQty: Number(raw.incomingQty) || 0,
                                  transfersInQty: Number(raw.transfersInQty) || 0,
                                  returnsQty: Number(raw.returnsQty) || 0,
                                  dispensedQty: Number(raw.dispensedQty) || 0,
                                  transfersOutQty: Number(raw.transfersOutQty) || 0,
                                  damagedQty: Number(raw.damagedQty) || 0,
                                  adjustmentsQty: Number(raw.adjustmentsQty) || 0,
                                });
                                setLedger(ledger.map((x) => (x.id === m.id ? { ...raw, computedClosingBalance } : x)));
                                onLogAudit('دفتر حركة المخازن', 'تعديل', `تحديث الحركة ${m.movementNumber} وإعادة احتساب الرصيد الآلي`);
                                onNotify('تم تحديث الحركة وإعادة احتساب الرصيد آلياً.');
                              },
                            })
                          }
                          onDelete={() => {
                            setLedger(ledger.filter((x) => x.id !== m.id));
                            onLogAudit('دفتر حركة المخازن', 'حذف', `حذف قيد غير معتمد ${m.movementNumber}`);
                            onNotify('تم حذف القيد.');
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ٥.٤ التحويل بين المخازن */}
        {whSubTab === 'transfers' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openAddTransfer}
                className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إنشاء إذن تحويل جديد</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">رقم التحويل / التاريخ</th>
                    <th className="p-2.5 border border-slate-700">من مخزن ← إلى مخزن</th>
                    <th className="p-2.5 border border-slate-700">السلعة والكمية</th>
                    <th className="p-2.5 border border-slate-700">بيانات النقل</th>
                    <th className="p-2.5 border border-slate-700 text-center">حالة الاعتماد</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((tr) => (
                    <tr key={tr.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 num-cell">
                        <span className="font-black text-[#164E83] block">{tr.transferNumber}</span>
                        <span className="text-[11px] font-bold text-slate-600">{formatDateArabic(tr.transferDate)}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-black text-[#102A43] block">من: {tr.fromWarehouseName}</span>
                        <span className="text-[11px] font-bold text-emerald-800">إلى: {tr.toWarehouseName}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-black block">{tr.commodityName}</span>
                        <span className="num-cell font-black text-[#164E83]">{formatArabicNumber(tr.quantity)} {tr.unit}</span>
                      </td>
                      <td className="p-2.5 font-bold text-slate-700">{tr.driverOrCarrier || '—'}</td>
                      <td className="p-2.5 text-center">
                        {tr.approvalStatus === 'بانتظار الاعتماد' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTransfers(
                                transfers.map((x) =>
                                  x.id === tr.id ? { ...x, approvalStatus: 'معتمد ومستلم', approvedBy: currentUserName } : x
                                )
                              );
                              onLogAudit('التحويل بين المخازن', 'اعتماد', `اعتماد إذن التحويل ${tr.transferNumber}`);
                              onNotify(`تم اعتماد إذن التحويل (${tr.transferNumber}) بنجاح.`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black cursor-pointer"
                          >
                            اعتماد التحويل الآن
                          </button>
                        ) : (
                          <span className="font-black text-emerald-700 block">{tr.approvalStatus}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          recordLabel={tr.transferNumber}
                          isApprovedImmutable={tr.approvalStatus === 'معتمد ومستلم'}
                          onReverseOrCancel={() => {
                            setTransfers(transfers.map((x) => (x.id === tr.id ? { ...x, approvalStatus: 'مرفوض' } : x)));
                            onLogAudit('التحويل بين المخازن', 'قيد عكسي', `إلغاء إذن التحويل المعتمد ${tr.transferNumber}`);
                            onNotify('تم تسجيل إلغاء موثق للتحويل.');
                          }}
                          onView={() => setCrudModal({ title: `إذن تحويل: ${tr.transferNumber}`, mode: 'view', record: tr as unknown as Record<string, unknown>, fields: transferFields })}
                          onAdd={openAddTransfer}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل إذن تحويل: ${tr.transferNumber}`,
                              mode: 'edit',
                              record: tr as unknown as Record<string, unknown>,
                              fields: transferFields,
                              onSave: (u) => {
                                setTransfers(transfers.map((x) => (x.id === tr.id ? (u as unknown as WarehouseTransferRecord) : x)));
                                onNotify('تم تحديث إذن التحويل.');
                              },
                            })
                          }
                          onDelete={() => {
                            setTransfers(transfers.filter((x) => x.id !== tr.id));
                            onNotify('تم حذف طلب التحويل.');
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ٥.٥ الجرد والمطابقة */}
        {whSubTab === 'stocktakes' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={openAddStocktake}
                className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل محضر جرد جديد</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2.5 border border-slate-700">محضر الجرد / التاريخ</th>
                    <th className="p-2.5 border border-slate-700">المخزن والسلعة</th>
                    <th className="p-2.5 border border-slate-700 text-center">الرصيد الدفتري</th>
                    <th className="p-2.5 border border-slate-700 text-center">الجرد الفعلي</th>
                    <th className="p-2.5 border border-slate-700 text-center">الفرق (الفعلي - الدفتري)</th>
                    <th className="p-2.5 border border-slate-700 text-center">النتيجة ولجنة الجرد</th>
                    <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {stocktakes.map((s) => (
                    <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 num-cell">
                        <span className="font-black text-[#164E83] block">{s.stocktakeNumber}</span>
                        <span className="text-[11px] font-bold text-slate-600">{formatDateArabic(s.stocktakeDate)}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-black text-[#102A43] block">{s.commodityName}</span>
                        <span className="text-[11px] font-bold text-slate-500">{s.warehouseName}</span>
                      </td>
                      <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(s.bookBalance)}</td>
                      <td className="p-2.5 text-center num-cell font-black">{formatArabicNumber(s.actualPhysicalCount)}</td>
                      <td className={`p-2.5 text-center num-cell font-black ${s.varianceQty < 0 ? 'text-red-700' : s.varianceQty > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {s.varianceQty > 0 ? `+${formatArabicNumber(s.varianceQty)}` : formatArabicNumber(s.varianceQty)} {s.unit}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`font-black block ${s.varianceQty < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{s.status}</span>
                        <span className="text-[10.5px] font-bold text-slate-600">{s.committeeChair}</span>
                      </td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          recordLabel={s.stocktakeNumber}
                          onView={() => setCrudModal({ title: `محضر جرد: ${s.stocktakeNumber}`, mode: 'view', record: s as unknown as Record<string, unknown>, fields: stocktakeFields })}
                          onAdd={openAddStocktake}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل محضر جرد: ${s.stocktakeNumber}`,
                              mode: 'edit',
                              record: s as unknown as Record<string, unknown>,
                              fields: stocktakeFields,
                              onSave: (u) => {
                                const raw = u as unknown as WarehouseStocktakeRecord;
                                const varianceQty = Number(((Number(raw.actualPhysicalCount) || 0) - (Number(raw.bookBalance) || 0)).toFixed(2));
                                const status: WarehouseStocktakeRecord['status'] =
                                  varianceQty === 0 ? 'مطابق' : varianceQty < 0 ? 'عجز يستوجب المساءلة' : 'زيادة دفتريه';
                                setStocktakes(stocktakes.map((x) => (x.id === s.id ? { ...raw, varianceQty, status } : x)));
                                onNotify('تم تحديث محضر الجرد وإعادة احتساب الفرق.');
                              },
                            })
                          }
                          onDelete={() => {
                            setStocktakes(stocktakes.filter((x) => x.id !== s.id));
                            onNotify('تم حذف محضر الجرد.');
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

  // ==================== الشاشة ٦: متابعة البطاقات التموينية ====================
  if (activeScreen === 'ration_cards') {
    const cardFields: EditableFieldSpec[] = [
      { key: 'cardNumber', label: 'رقم البطاقة التموينية' },
      { key: 'headOfFamilyName', label: 'اسم رب الأسرة' },
      { key: 'nationalId', label: 'الرقم القومي' },
      { key: 'phoneNumber', label: 'رقم المحمول المسجل' },
      { key: 'beneficiariesCount', label: 'عدد المستفيدين', type: 'number' },
      { key: 'cardType', label: 'نوع البطاقة', type: 'select', options: ['سلع + خبز', 'سلع فقط', 'خبز فقط', 'تكافل وكرامة'] },
      { key: 'village', label: 'القرية', type: 'select', options: MAHALLA_VILLAGES },
      { key: 'localUnit', label: 'الوحدة المحلية', type: 'select', options: MAHALLA_LOCAL_UNITS },
      { key: 'assignedMerchantName', label: 'التاجر التمويني المربوط', type: 'select', options: merchants.length ? merchants.map((m) => m.merchantName) : ['محمود إبراهيم الششتاوي'] },
      { key: 'monthlySupportValueEgp', label: 'قيمة الدعم الشهري (ج.م)', type: 'number' },
      { key: 'lastIssueDate', label: 'تاريخ آخر صرف', type: 'date' },
      { key: 'status', label: 'حالة البطاقة', type: 'select', options: ['نشطة', 'موقوفة مؤقتاً', 'موقوفة لحين التحديث', 'بدل فاقد/تالف', 'محولة لإدارة أخرى', 'ملغاة'] },
      { key: 'notes', label: 'ملاحظات' },
    ];

    const filteredCards = cards.filter(
      (c) =>
        (cardStatusFilter === 'ALL' || c.status === cardStatusFilter) &&
        (!searchTerm || c.headOfFamilyName.includes(searchTerm) || c.cardNumber.includes(searchTerm) || c.village.includes(searchTerm))
    );

    const openAddCard = () => {
      const rec: RationCardRecord = {
        id: `card-${Date.now()}`,
        cardNumber: `11604489${String(cards.length + 1000)}`,
        headOfFamilyName: '',
        nationalId: '',
        phoneNumber: '',
        beneficiariesCount: 4,
        cardType: 'سلع + خبز',
        supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
        supplyOffice: 'مكتب تموين مركز المحلة',
        village: MAHALLA_VILLAGES[0],
        localUnit: MAHALLA_LOCAL_UNITS[0],
        assignedMerchantName: merchants[0]?.merchantName || '',
        monthlySupportValueEgp: 200,
        lastIssueDate: todayRef,
        status: 'نشطة',
        notes: '',
      };
      setCrudModal({
        title: 'إضافة بطاقة تموينية جديدة للمتابعة',
        mode: 'edit',
        record: rec as unknown as Record<string, unknown>,
        fields: cardFields,
        onSave: (u) => {
          setCards([u as unknown as RationCardRecord, ...cards]);
          onLogAudit('متابعة البطاقات التموينية', 'إضافة', `تسجيل بطاقة تموينية جديدة (${String(u.headOfFamilyName)})`);
          onNotify('تمت إضافة البطاقة التموينية بنجاح.');
        },
      });
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#164E83]" />
              <span>٦. سجل متابعة البطاقات التموينية وحماية خصوصية البيانات</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              يتم إخفاء الرقم القومي ورقم البطاقة جزئياً افتراضياً حفاظاً على خصوصية المواطنين ولا يُكشف إلا لصاحب الصلاحية
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowFullSensitive((v) => !v)}
              className={`px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 cursor-pointer border ${
                showFullSensitive
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-[#102A43] border-slate-300'
              }`}
            >
              {showFullSensitive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showFullSensitive ? 'إخفاء البيانات الشخصية' : 'إظهار الأرقام كاملة (صلاحية)'}</span>
            </button>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم / القرية / رقم البطاقة..."
                className="pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 font-bold w-56"
              />
            </div>
            <select
              value={cardStatusFilter}
              onChange={(e) => setCardStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 font-black bg-white"
            >
              <option value="ALL">جميع الحالات (٦ حالات رسمية)</option>
              <option value="نشطة">نشطة</option>
              <option value="موقوفة مؤقتاً">موقوفة مؤقتاً</option>
              <option value="موقوفة لحين التحديث">موقوفة لحين التحديث</option>
              <option value="بدل فاقد/تالف">بدل فاقد/تالف</option>
              <option value="محولة لإدارة أخرى">محولة لإدارة أخرى</option>
              <option value="ملغاة">ملغاة</option>
            </select>
            <button
              type="button"
              onClick={openAddCard}
              className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة بطاقة</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <TableToolbar
            tableName="سجل البطاقات التموينية"
            totalRows={filteredCards.length}
            pinnedCount={pinnedMode === 'manual' ? 1 : 0}
            onClearPins={() => setPinnedMode('none')}
            onManualPin={() => setPinnedMode('manual')}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700">رقم البطاقة</th>
                  <th className="p-2.5 border border-slate-700">رب الأسرة والرقم القومي</th>
                  <th className="p-2.5 border border-slate-700">القرية والتاجر المربوط</th>
                  <th className="p-2.5 border border-slate-700 text-center">الأفراد / الدعم الشهري</th>
                  <th className="p-2.5 border border-slate-700 text-center">آخر صرف</th>
                  <th className="p-2.5 border border-slate-700 text-center">الحالة الرسمية</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((c) => (
                  <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2.5 num-cell font-black text-[#164E83]">
                      {maskNationalIdOrCard(c.cardNumber, showFullSensitive)}
                      <span className="block text-[10.5px] font-bold text-slate-500">{c.cardType}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="font-black text-[#102A43] block">{c.headOfFamilyName}</span>
                      <span className="num-cell text-[10.5px] font-bold text-slate-500">
                        قومي: {maskNationalIdOrCard(c.nationalId, showFullSensitive)}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="font-bold text-slate-800 block">{c.village}</span>
                      <span className="text-[11px] font-bold text-[#164E83]">{c.assignedMerchantName}</span>
                    </td>
                    <td className="p-2.5 text-center num-cell">
                      <span className="font-black text-[#102A43] block">{toArabicNumerals(c.beneficiariesCount)} أفراد</span>
                      <span className="text-[11px] font-black text-emerald-700">{formatArabicCurrency(c.monthlySupportValueEgp)}</span>
                    </td>
                    <td className="p-2.5 text-center num-cell font-bold">{formatDateArabic(c.lastIssueDate)}</td>
                    <td className="p-2.5 text-center font-black">
                      <span className={c.status === 'نشطة' ? 'text-emerald-700' : c.status === 'ملغاة' ? 'text-red-700' : 'text-amber-700'}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <TableActionButtons
                        recordLabel={c.headOfFamilyName}
                        onView={() => setCrudModal({ title: `بطاقة تموينية: ${c.headOfFamilyName}`, mode: 'view', record: c as unknown as Record<string, unknown>, fields: cardFields })}
                        onAdd={openAddCard}
                        onEdit={() =>
                          setCrudModal({
                            title: `تعديل البطاقة: ${c.headOfFamilyName}`,
                            mode: 'edit',
                            record: c as unknown as Record<string, unknown>,
                            fields: cardFields,
                            onSave: (u) => {
                              setCards(cards.map((x) => (x.id === c.id ? (u as unknown as RationCardRecord) : x)));
                              onLogAudit('متابعة البطاقات التموينية', 'تعديل', `تحديث بيانات بطاقة ${c.headOfFamilyName}`);
                              onNotify('تم تحديث بيانات البطاقة التموينية.');
                            },
                          })
                        }
                        onDelete={() => {
                          setCards(cards.filter((x) => x.id !== c.id));
                          onLogAudit('متابعة البطاقات التموينية', 'حذف', `حذف سجل بطاقة ${c.headOfFamilyName}`);
                          onNotify('تم حذف البطاقة من سجل المتابعة.');
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

  // ==================== الشاشة ٧: قاعدة بيانات المستفيدين (سجلات مستقلة ٢٠٢٣ / ٢٠٢٤ / ٢٠٢٥ + إضافة سنة جديدة) ====================
  if (activeScreen === 'beneficiaries_db') {
    const handleAddNewYearSnapshot = () => {
      if (!newYearInput || newYearInput < 2020 || newYearInput > 2040) return;
      if (availableYears.includes(newYearInput)) {
        onNotify(`السنة (${toArabicNumerals(newYearInput)}) مسجلة بالفعل في السجل التاريخي المستقل.`);
        return;
      }
      const next = beneficiaryStats.map((v) => {
        const last = v.yearlySnapshots[v.yearlySnapshots.length - 1];
        return {
          ...v,
          yearlySnapshots: [
            ...v.yearlySnapshots,
            {
              year: newYearInput,
              cardsCount: Math.round((last?.cardsCount || 5000) * 1.02),
              beneficiariesCount: Math.round((last?.beneficiariesCount || 20000) * 1.02),
              monthlySupportValueEgp: Math.round((last?.monthlySupportValueEgp || 1000000) * 1.02),
              dispensedSugarKg: Math.round((last?.dispensedSugarKg || 240000) * 1.02),
              dispensedOilBottles: Math.round((last?.dispensedOilBottles || 200000) * 1.02),
              dispensedOtherUnits: Math.round((last?.dispensedOtherUnits || 120000) * 1.02),
            },
          ],
        };
      });
      setBeneficiaryStats(next);
      setSelectedYearFilter(newYearInput);
      onLogAudit('قاعدة بيانات المستفيدين', 'إضافة', `فتح سجل إحصائي مستقل لعام ${newYearInput} دون الكتابة فوق الأعوام السابقة`);
      onNotify(`تم إنشاء سجل إحصائي مستقل لعام ${toArabicNumerals(newYearInput)} مع الحفاظ الكامل على أعوام ٢٠٢٣ و٢٠٢٤ و٢٠٢٥.`);
    };

    const benVillageFields: EditableFieldSpec[] = [
      { key: 'village', label: 'القرية', type: 'select', options: MAHALLA_VILLAGES },
      { key: 'localUnit', label: 'الوحدة المحلية', type: 'select', options: MAHALLA_LOCAL_UNITS },
      { key: 'merchantsCount', label: 'عدد المنافذ التموينية', type: 'number' },
      { key: 'cardsCount', label: `عدد البطاقات (${toArabicNumerals(selectedYearFilter)})`, type: 'number' },
      { key: 'beneficiariesCount', label: `عدد المستفيدين (${toArabicNumerals(selectedYearFilter)})`, type: 'number' },
      { key: 'monthlySupportValueEgp', label: `الدعم الشهري ج.م (${toArabicNumerals(selectedYearFilter)})`, type: 'number' },
      { key: 'dispensedSugarKg', label: `السكر المنصرف سنوياً كجم (${toArabicNumerals(selectedYearFilter)})`, type: 'number' },
      { key: 'dispensedOilBottles', label: `الزيت المنصرف سنوياً زجاجة (${toArabicNumerals(selectedYearFilter)})`, type: 'number' },
    ];

    const openAddBenVillage = () => {
      setCrudModal({
        title: `إضافة إحصاء قرية جديد لعام ${toArabicNumerals(selectedYearFilter)}`,
        mode: 'edit',
        record: {
          village: MAHALLA_VILLAGES[0],
          localUnit: MAHALLA_LOCAL_UNITS[0],
          merchantsCount: 5,
          cardsCount: 4000,
          beneficiariesCount: 16000,
          monthlySupportValueEgp: 800000,
          dispensedSugarKg: 192000,
          dispensedOilBottles: 160000,
        },
        fields: benVillageFields,
        onSave: (u) => {
          const newRec: VillageBeneficiaryStatRecord = {
            id: `vbs-${Date.now()}`,
            supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
            localUnit: String(u.localUnit),
            village: String(u.village),
            merchantsCount: Number(u.merchantsCount) || 1,
            yearlySnapshots: availableYears.map((yr) => ({
              year: yr,
              cardsCount: Number(u.cardsCount) || 0,
              beneficiariesCount: Number(u.beneficiariesCount) || 0,
              monthlySupportValueEgp: Number(u.monthlySupportValueEgp) || 0,
              dispensedSugarKg: Number(u.dispensedSugarKg) || 0,
              dispensedOilBottles: Number(u.dispensedOilBottles) || 0,
              dispensedOtherUnits: 0,
            })),
          };
          setBeneficiaryStats([newRec, ...beneficiaryStats]);
          onNotify('تمت إضافة سجل إحصاء القرية بنجاح.');
        },
      });
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#164E83]" />
              <span>٧. قاعدة بيانات المستفيدين والسجل التاريخي المستقل للأعوام (٢٠٢٣ · ٢٠٢٤ · ٢٠٢٥)</span>
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              يُحفظ كل عام في سجل مستقل تماماً دون الكتابة فوق الأعوام السابقة مع إمكانية فتح سنوات جديدة ومقارنة التطور السنوي
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYearFilter(yr)}
                  className={`px-3 py-1 rounded-lg font-black num-cell cursor-pointer ${
                    selectedYearFilter === yr ? 'bg-[#102A43] text-[#C6A15B]' : 'text-[#102A43] hover:bg-white'
                  }`}
                >
                  عام {toArabicNumerals(yr)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={newYearInput}
                onChange={(e) => setNewYearInput(Number(e.target.value))}
                className="w-20 px-2 py-1.5 border border-slate-300 rounded-xl font-black num-cell text-center"
              />
              <button
                type="button"
                onClick={handleAddNewYearSnapshot}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black flex items-center gap-1 cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>إضافة سنة جديدة</span>
              </button>
            </div>
          </div>
        </div>

        {/* جدول المقارنة التاريخية المستقل */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-[#102A43]">
              إحصاءات القرى والوحدات المحلية لعام ({toArabicNumerals(selectedYearFilter)}) ومقارنتها بالأعوام ٢٠٢٣ / ٢٠٢٤ / ٢٠٢٥
            </h4>
            <button
              type="button"
              onClick={openAddBenVillage}
              className="px-3 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة قرية للإحصاء</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#102A43] text-white">
                  <th className="p-2.5 border border-slate-700">القرية / الوحدة المحلية</th>
                  <th className="p-2.5 border border-slate-700 text-center">مستفيدو ٢٠٢٣</th>
                  <th className="p-2.5 border border-slate-700 text-center">مستفيدو ٢٠٢٤</th>
                  <th className="p-2.5 border border-slate-700 text-center">مستفيدو ٢٠٢٥</th>
                  <th className="p-2.5 border border-slate-700 text-center bg-[#164E83]">بطاقات {toArabicNumerals(selectedYearFilter)}</th>
                  <th className="p-2.5 border border-slate-700 text-center bg-[#164E83]">دعم شهري ({toArabicNumerals(selectedYearFilter)})</th>
                  <th className="p-2.5 border border-slate-700 text-center">السكر / الزيت ({toArabicNumerals(selectedYearFilter)})</th>
                  <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {beneficiaryStats.map((v) => {
                  const s23 = v.yearlySnapshots.find((s) => s.year === 2023);
                  const s24 = v.yearlySnapshots.find((s) => s.year === 2024);
                  const s25 = v.yearlySnapshots.find((s) => s.year === 2025);
                  const sSel = v.yearlySnapshots.find((s) => s.year === selectedYearFilter) || s25;
                  return (
                    <tr key={v.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5">
                        <span className="font-black text-[#102A43] block">{v.village}</span>
                        <span className="text-[10.5px] font-bold text-slate-500">{v.localUnit} ({toArabicNumerals(v.merchantsCount)} منافذ)</span>
                      </td>
                      <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(s23?.beneficiariesCount || 0)}</td>
                      <td className="p-2.5 text-center num-cell font-bold">{formatArabicNumber(s24?.beneficiariesCount || 0)}</td>
                      <td className="p-2.5 text-center num-cell font-black text-[#164E83]">{formatArabicNumber(s25?.beneficiariesCount || 0)}</td>
                      <td className="p-2.5 text-center num-cell font-black bg-blue-50/50">{formatArabicNumber(sSel?.cardsCount || 0)}</td>
                      <td className="p-2.5 text-center num-cell font-black text-emerald-800 bg-blue-50/50">
                        {formatArabicCurrency(sSel?.monthlySupportValueEgp || 0)}
                      </td>
                      <td className="p-2.5 text-center num-cell font-bold">
                        {formatArabicNumber(sSel?.dispensedSugarKg || 0)} كجم / {formatArabicNumber(sSel?.dispensedOilBottles || 0)} زجاجة
                      </td>
                      <td className="p-2.5 text-center">
                        <TableActionButtons
                          recordLabel={v.village}
                          onView={() =>
                            setCrudModal({
                              title: `إحصاء مستفيدي ${v.village} لعام ${toArabicNumerals(selectedYearFilter)}`,
                              mode: 'view',
                              record: {
                                village: v.village,
                                localUnit: v.localUnit,
                                merchantsCount: v.merchantsCount,
                                cardsCount: sSel?.cardsCount || 0,
                                beneficiariesCount: sSel?.beneficiariesCount || 0,
                                monthlySupportValueEgp: sSel?.monthlySupportValueEgp || 0,
                                dispensedSugarKg: sSel?.dispensedSugarKg || 0,
                                dispensedOilBottles: sSel?.dispensedOilBottles || 0,
                              },
                              fields: benVillageFields,
                            })
                          }
                          onAdd={openAddBenVillage}
                          onEdit={() =>
                            setCrudModal({
                              title: `تعديل إحصاء ${v.village} لعام ${toArabicNumerals(selectedYearFilter)}`,
                              mode: 'edit',
                              record: {
                                village: v.village,
                                localUnit: v.localUnit,
                                merchantsCount: v.merchantsCount,
                                cardsCount: sSel?.cardsCount || 0,
                                beneficiariesCount: sSel?.beneficiariesCount || 0,
                                monthlySupportValueEgp: sSel?.monthlySupportValueEgp || 0,
                                dispensedSugarKg: sSel?.dispensedSugarKg || 0,
                                dispensedOilBottles: sSel?.dispensedOilBottles || 0,
                              },
                              fields: benVillageFields,
                              onSave: (u) => {
                                setBeneficiaryStats(
                                  beneficiaryStats.map((row) =>
                                    row.id !== v.id
                                      ? row
                                      : {
                                          ...row,
                                          village: String(u.village),
                                          localUnit: String(u.localUnit),
                                          merchantsCount: Number(u.merchantsCount) || row.merchantsCount,
                                          yearlySnapshots: row.yearlySnapshots.map((sn) =>
                                            sn.year !== selectedYearFilter
                                              ? sn
                                              : {
                                                  ...sn,
                                                  cardsCount: Number(u.cardsCount) || 0,
                                                  beneficiariesCount: Number(u.beneficiariesCount) || 0,
                                                  monthlySupportValueEgp: Number(u.monthlySupportValueEgp) || 0,
                                                  dispensedSugarKg: Number(u.dispensedSugarKg) || 0,
                                                  dispensedOilBottles: Number(u.dispensedOilBottles) || 0,
                                                }
                                          ),
                                        }
                                  )
                                );
                                onNotify(`تم تحديث إحصاء ${v.village} لعام ${toArabicNumerals(selectedYearFilter)} فقط دون المساس بالأعوام الأخرى.`);
                              },
                            })
                          }
                          onDelete={() => {
                            setBeneficiaryStats(beneficiaryStats.filter((x) => x.id !== v.id));
                            onNotify(`تم حذف سجل إحصاء ${v.village}.`);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

  // ==================== الشاشة ٨: سجل عمليات صرف المواطنين (مع منع تكرار الرقم المرجعي) ====================
  const issueFields: EditableFieldSpec[] = [
    { key: 'referenceNumber', label: 'الرقم المرجعي للعملية (فريد يمنع التكرار)' },
    { key: 'issueDate', label: 'تاريخ الصرف', type: 'date' },
    { key: 'cardNumber', label: 'رقم البطاقة التموينية' },
    { key: 'headOfFamilyName', label: 'اسم المواطن / رب الأسرة' },
    { key: 'merchantName', label: 'التاجر التمويني', type: 'select', options: merchants.length ? merchants.map((m) => m.merchantName) : ['محمود إبراهيم الششتاوي'] },
    { key: 'village', label: 'القرية', type: 'select', options: MAHALLA_VILLAGES },
    { key: 'sourceChannel', label: 'مصدر الصرف الرسمي', type: 'select', options: ['ماكينة POS الرسمية', 'بوابة مصر الرقمية', 'استيراد شهري مجمع'] },
    { key: 'itemsSummary', label: 'تفصيل السلع المنصرفة' },
    { key: 'totalSupportUsedEgp', label: 'قيمة الدعم المستخدم (ج.م)', type: 'number' },
    { key: 'cashDiffPaidEgp', label: 'فرق السعر النقدي (ج.م)', type: 'number' },
    { key: 'status', label: 'حالة العملية', type: 'select', options: ['تم الصرف', 'ملغى بقيد عكسي', 'مرفوض'] },
    { key: 'auditNote', label: 'ملاحظة المراجعة والتدقيق' },
  ];

  const openAddIssue = () => {
    const rec: CitizenIssueTransactionRecord = {
      id: `cit-${Date.now()}`,
      referenceNumber: `TXN-POS-${todayRef.replace(/-/g, '')}-${String(citizenIssues.length + 1).padStart(3, '0')}`,
      issueDate: todayRef,
      cardNumber: cards[0]?.cardNumber || '116044892104',
      headOfFamilyName: cards[0]?.headOfFamilyName || '',
      merchantCode: merchants[0]?.merchantCode || 'MER-GH-001',
      merchantName: merchants[0]?.merchantName || 'محمود إبراهيم الششتاوي',
      village: MAHALLA_VILLAGES[0],
      sourceChannel: 'ماكينة POS الرسمية',
      itemsSummary: '٤ سكر تمويني + ٤ زيت ٨٠٠ مللي',
      totalSupportUsedEgp: 170.4,
      cashDiffPaidEgp: 4.5,
      status: 'تم الصرف',
      auditNote: 'عملية مسجلة من المصدر الرسمي',
    };
    setCrudModal({
      title: 'تسجيل عملية صرف مواطن جديدة (فحص منع التكرار)',
      mode: 'edit',
      record: rec as unknown as Record<string, unknown>,
      fields: issueFields,
      onSave: (u) => {
        const item = u as unknown as CitizenIssueTransactionRecord;
        const duplicate = citizenIssues.some(
          (x) => x.referenceNumber.trim().toLowerCase() === item.referenceNumber.trim().toLowerCase()
        );
        if (duplicate) {
          onNotify(`تنبيه منع التكرار: الرقم المرجعي (${item.referenceNumber}) مسجل مسبقاً ولم يتم تكرار القيد.`);
          return;
        }
        setCitizenIssues([item, ...citizenIssues]);
        onLogAudit('عمليات صرف المواطنين', 'إضافة', `تسجيل عملية صرف ${item.referenceNumber}`);
        onNotify(`تم قيد عملية الصرف (${item.referenceNumber}) بنجاح.`);
      },
    });
  };

  const handleImportOfficialBatch = () => {
    const refNo = `TXN-IMP-${todayRef.replace(/-/g, '')}-${String(citizenIssues.length + 101)}`;
    const imported: CitizenIssueTransactionRecord = {
      id: `cit-imp-${Date.now()}`,
      referenceNumber: refNo,
      issueDate: todayRef,
      cardNumber: '116044895512',
      headOfFamilyName: 'جمال الدين محمد صقر (استيراد رسمي)',
      merchantCode: merchants[2]?.merchantCode || 'MER-GH-003',
      merchantName: merchants[2]?.merchantName || 'هناء محمد عبد العال',
      village: 'الهياتم',
      sourceChannel: 'استيراد شهري مجمع',
      itemsSummary: '٥ سكر تمويني + ٤ زيت ٨٠٠ مللي + ٤ مكرونة',
      totalSupportUsedEgp: 217,
      cashDiffPaidEgp: 7,
      status: 'تم الصرف',
      auditNote: 'مستوردة من كشف ماكينات POS المعتمد بعد التحقق من عدم التكرار',
    };
    setCitizenIssues([imported, ...citizenIssues]);
    onLogAudit('عمليات صرف المواطنين', 'إضافة', `استيراد رسمي للعملية ${refNo}`);
    onNotify(`تم استيراد عملية الصرف (${refNo}) من المصدر الرسمي بنجاح.`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[#102A43] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>٨. سجل عمليات صرف المواطنين (بمنع تكرار الرقم المرجعي والقيد العكسي الموثق)</span>
          </h3>
          <p className="text-[11px] font-bold text-slate-600">
            متابعة حركات الصرف من ماكينات POS أو الاستيراد الرسمي مع منع تكرار أي رقم مرجعي وحماية العمليات المعتمدة من الحذف النهائي
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleImportOfficialBatch}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>استيراد من كشف POS الرسمي</span>
          </button>
          <button
            type="button"
            onClick={openAddIssue}
            className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تسجيل عملية صرف</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="bg-[#102A43] text-white">
              <th className="p-2.5 border border-slate-700">الرقم المرجعي / التاريخ</th>
              <th className="p-2.5 border border-slate-700">المواطن ورقم البطاقة</th>
              <th className="p-2.5 border border-slate-700">التاجر والقرية</th>
              <th className="p-2.5 border border-slate-700">تفصيل السلع المنصرفة</th>
              <th className="p-2.5 border border-slate-700 text-center">الدعم / النقدي</th>
              <th className="p-2.5 border border-slate-700 text-center">الحالة</th>
              <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {citizenIssues.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="p-2.5 num-cell">
                  <span className="font-black text-[#164E83] block">{tx.referenceNumber}</span>
                  <span className="text-[10.5px] font-bold text-slate-500">{formatDateArabic(tx.issueDate)} · {tx.sourceChannel}</span>
                </td>
                <td className="p-2.5">
                  <span className="font-black text-[#102A43] block">{tx.headOfFamilyName}</span>
                  <span className="num-cell text-[10.5px] font-bold text-slate-500">
                    بطاقة: {maskNationalIdOrCard(tx.cardNumber, showFullSensitive)}
                  </span>
                </td>
                <td className="p-2.5">
                  <span className="font-bold text-slate-800 block">{tx.merchantName}</span>
                  <span className="text-[10.5px] font-bold text-slate-500">{tx.village}</span>
                </td>
                <td className="p-2.5 font-bold text-slate-700">{tx.itemsSummary}</td>
                <td className="p-2.5 text-center num-cell">
                  <span className="font-black text-emerald-800 block">{formatArabicCurrency(tx.totalSupportUsedEgp)}</span>
                  <span className="text-[10.5px] font-bold text-slate-500">نقدي: {formatArabicCurrency(tx.cashDiffPaidEgp)}</span>
                </td>
                <td className="p-2.5 text-center font-black">
                  <span className={tx.status === 'تم الصرف' ? 'text-emerald-700' : 'text-red-700'}>{tx.status}</span>
                </td>
                <td className="p-2.5 text-center">
                  <TableActionButtons
                    recordLabel={tx.referenceNumber}
                    isApprovedImmutable={tx.status === 'تم الصرف'}
                    onReverseOrCancel={() => {
                      setCitizenIssues(
                        citizenIssues.map((x) =>
                          x.id === tx.id
                            ? { ...x, status: 'ملغى بقيد عكسي', auditNote: `تم الإلغاء بقيد عكسي بواسطة ${currentUserName}` }
                            : x
                        )
                      );
                      onLogAudit('عمليات صرف المواطنين', 'قيد عكسي', `إلغاء عملية الصرف ${tx.referenceNumber} بقيد عكسي`);
                      onNotify(`تم إلغاء العملية (${tx.referenceNumber}) بقيد عكسي موثق في سجل التدقيق.`);
                    }}
                    onView={() => setCrudModal({ title: `عملية صرف: ${tx.referenceNumber}`, mode: 'view', record: tx as unknown as Record<string, unknown>, fields: issueFields })}
                    onAdd={openAddIssue}
                    onEdit={() =>
                      setCrudModal({
                        title: `تعديل عملية الصرف: ${tx.referenceNumber}`,
                        mode: 'edit',
                        record: tx as unknown as Record<string, unknown>,
                        fields: issueFields,
                        onSave: (u) => {
                          setCitizenIssues(citizenIssues.map((x) => (x.id === tx.id ? (u as unknown as CitizenIssueTransactionRecord) : x)));
                          onNotify('تم تحديث بيانات العملية.');
                        },
                      })
                    }
                    onDelete={() => {
                      setCitizenIssues(citizenIssues.filter((x) => x.id !== tx.id));
                      onNotify('تم حذف السجل.');
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
