'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  Printer,
  Search,
  Settings,
} from 'lucide-react';
import {
  ButaneDistributorMovementRecord,
  ButaneDistributorRecord,
  ButaneVillageAllocationRecord,
  ButaneWarehouseMovementRecord,
  ButaneWarehouseRecord,
  CommercialActivityRecord,
  CommercialEstablishmentRecord,
  CommercialLicenseRecord,
  CommercialSeizureRecord,
  CommercialSettlementRecord,
  CommercialViolationReportRecord,
  CommodityPriceObservationRecord,
  FuelStationDailyMovementRecord,
  FuelStationInspectionRecord,
  FuelStationRecord,
  InternalTradeAlertRecord,
  InternalTradeSettings,
  MarketCommodityRecord,
  PetroleumAllocationRecord,
  SeizureMovementRecord,
  TradeInspectionCampaignRecord,
} from '@/lib/internal-trade-store';
import {
  formatArabicCurrency,
  formatArabicNumber,
  formatDateArabic,
  toArabicNumerals,
} from '@/lib/utils';
import { exportCsvUtf8Bom } from '@/lib/debts-data';
import { OfficialPrintModal } from '../debts/DebtsSharedUi';
import {
  EditableFieldSpec,
  TableActionButtons,
  UniversalCrudModal,
} from './TradeSharedCrudUi';

export type AlertsReportsSettingsScreenKey =
  | 'smart_alerts'
  | 'reports_center'
  | 'settings_and_schema';

interface InternalTradeAlertsReportsSettingsViewProps {
  activeScreen: AlertsReportsSettingsScreenKey;
  currentUserName: string;
  todayRef: string;
  settings: InternalTradeSettings;
  onUpdateSettings: (next: InternalTradeSettings) => void;
  alerts: InternalTradeAlertRecord[];
  closedAlertIds: Record<string, { closedAt: string; notes: string }>;
  onCloseAlert: (alertId: string, notes: string) => void;
  establishments: CommercialEstablishmentRecord[];
  activities: CommercialActivityRecord[];
  licenses: CommercialLicenseRecord[];
  campaigns: TradeInspectionCampaignRecord[];
  reports: CommercialViolationReportRecord[];
  settlements: CommercialSettlementRecord[];
  seizures: CommercialSeizureRecord[];
  seizureMovements: SeizureMovementRecord[];
  commodities: MarketCommodityRecord[];
  priceObservations: CommodityPriceObservationRecord[];
  butaneAllocations: ButaneVillageAllocationRecord[];
  petroleumAllocations: PetroleumAllocationRecord[];
  fuelStations: FuelStationRecord[];
  fuelMovements: FuelStationDailyMovementRecord[];
  fuelInspections: FuelStationInspectionRecord[];
  butaneWarehouses: ButaneWarehouseRecord[];
  butaneWarehouseMovements: ButaneWarehouseMovementRecord[];
  butaneDistributors: ButaneDistributorRecord[];
  butaneDistributorMovements: ButaneDistributorMovementRecord[];
  onNotify: (msg: string) => void;
}

interface ReportDefinition {
  id: string;
  num: number;
  group: string;
  title: string;
  orientation: 'portrait' | 'landscape';
}

const ALL_39_REPORTS: ReportDefinition[] = [
  // تقارير المنشآت والتراخيص
  { id: 'rep-01', num: 1, group: 'تقارير المنشآت والتراخيص', title: '١. تقرير شامل بالمحلات والمنشآت التجارية', orientation: 'landscape' },
  { id: 'rep-02', num: 2, group: 'تقارير المنشآت والتراخيص', title: '٢. تقرير المنشآت حسب الإدارة والقرية', orientation: 'portrait' },
  { id: 'rep-03', num: 3, group: 'تقارير المنشآت والتراخيص', title: '٣. تقرير الأنشطة التجارية', orientation: 'portrait' },
  { id: 'rep-04', num: 4, group: 'تقارير المنشآت والتراخيص', title: '٤. تقرير المنشآت غير المرخصة', orientation: 'portrait' },
  { id: 'rep-05', num: 5, group: 'تقارير المنشآت والتراخيص', title: '٥. تقرير البطاقة الضريبية المنتهية', orientation: 'portrait' },
  { id: 'rep-06', num: 6, group: 'تقارير المنشآت والتراخيص', title: '٦. تقرير السجل التجاري المنتهي', orientation: 'portrait' },
  { id: 'rep-07', num: 7, group: 'تقارير المنشآت والتراخيص', title: '٧. تقرير التراخيص المنتهية', orientation: 'portrait' },
  { id: 'rep-08', num: 8, group: 'تقارير المنشآت والتراخيص', title: '٨. تقرير التراخيص التي قاربت على الانتهاء', orientation: 'portrait' },
  // تقارير الحملات والمخالفات
  { id: 'rep-09', num: 9, group: 'تقارير الحملات والمخالفات', title: '٩. تقرير الحملات التموينية', orientation: 'landscape' },
  { id: 'rep-10', num: 10, group: 'تقارير الحملات والمخالفات', title: '١٠. تقرير نتائج الحملات', orientation: 'landscape' },
  { id: 'rep-11', num: 11, group: 'تقارير الحملات والمخالفات', title: '١١. تقرير المحاضر حسب الجهة المحررة', orientation: 'portrait' },
  { id: 'rep-12', num: 12, group: 'تقارير الحملات والمخالفات', title: '١٢. تقرير المخالفات حسب النوع', orientation: 'portrait' },
  { id: 'rep-13', num: 13, group: 'تقارير الحملات والمخالفات', title: '١٣. تقرير المخالفات حسب القرية والوحدة', orientation: 'portrait' },
  { id: 'rep-14', num: 14, group: 'تقارير الحملات والمخالفات', title: '١٤. تقرير التصالحات', orientation: 'landscape' },
  { id: 'rep-15', num: 15, group: 'تقارير الحملات والمخالفات', title: '١٥. تقرير المبالغ المحصلة والمتبقية', orientation: 'portrait' },
  { id: 'rep-16', num: 16, group: 'تقارير الحملات والمخالفات', title: '١٦. تقرير المضبوطات', orientation: 'landscape' },
  { id: 'rep-17', num: 17, group: 'تقارير الحملات والمخالفات', title: '١٧. تقرير التحفظات وحركة المضبوطات', orientation: 'landscape' },
  { id: 'rep-18', num: 18, group: 'تقارير الحملات والمخالفات', title: '١٨. تقرير المضبوطات التي لم يتم التصرف فيها', orientation: 'portrait' },
  // تقارير الأسواق والأسعار
  { id: 'rep-19', num: 19, group: 'تقارير الأسواق والأسعار', title: '١٩. تقرير متابعة الأسواق', orientation: 'portrait' },
  { id: 'rep-20', num: 20, group: 'تقارير الأسواق والأسعار', title: '٢٠. تقرير أسعار السلع', orientation: 'landscape' },
  { id: 'rep-21', num: 21, group: 'تقارير الأسواق والأسعار', title: '٢١. تقرير مقارنة الأسعار بين القرى', orientation: 'landscape' },
  { id: 'rep-22', num: 22, group: 'تقارير الأسواق والأسعار', title: '٢٢. تقرير السلع غير المتوفرة أو المحدودة', orientation: 'portrait' },
  { id: 'rep-23', num: 23, group: 'تقارير الأسواق والأسعار', title: '٢٣. تقرير تغير الأسعار خلال فترة', orientation: 'portrait' },
  // تقارير البوتاجاز
  { id: 'rep-24', num: 24, group: 'تقارير البوتاجاز', title: '٢٤. تقرير مستودعات البوتاجاز', orientation: 'landscape' },
  { id: 'rep-25', num: 25, group: 'تقارير البوتاجاز', title: '٢٥. تقرير سجل الموزعين', orientation: 'landscape' },
  { id: 'rep-26', num: 26, group: 'تقارير البوتاجاز', title: '٢٦. تقرير حركة المستودعات اليومية', orientation: 'landscape' },
  { id: 'rep-27', num: 27, group: 'تقارير البوتاجاز', title: '٢٧. تقرير حركة الموزعين', orientation: 'landscape' },
  { id: 'rep-28', num: 28, group: 'تقارير البوتاجاز', title: '٢٨. تقرير نصيب الفرد من البوتاجاز', orientation: 'portrait' },
  { id: 'rep-29', num: 29, group: 'تقارير البوتاجاز', title: '٢٩. تقرير المستفيدين لعام ٢٠٢٣', orientation: 'portrait' },
  { id: 'rep-30', num: 30, group: 'تقارير البوتاجاز', title: '٣٠. تقرير المستفيدين لعام ٢٠٢٤', orientation: 'portrait' },
  { id: 'rep-31', num: 31, group: 'تقارير البوتاجاز', title: '٣١. تقرير المستفيدين لعام ٢٠٢٥', orientation: 'portrait' },
  { id: 'rep-32', num: 32, group: 'تقارير البوتاجاز', title: '٣٢. تقرير المقارنة السنوية بين الأعوام الثلاثة (بوتاجاز)', orientation: 'landscape' },
  // تقارير المواد البترولية ومحطات الوقود
  { id: 'rep-33', num: 33, group: 'تقارير المواد البترولية ومحطات الوقود', title: '٣٣. تقرير محطات الوقود', orientation: 'landscape' },
  { id: 'rep-34', num: 34, group: 'تقارير المواد البترولية ومحطات الوقود', title: '٣٤. تقرير الحركة اليومية للمحطات (سجل ٢١ بترول)', orientation: 'landscape' },
  { id: 'rep-35', num: 35, group: 'تقارير المواد البترولية ومحطات الوقود', title: '٣٥. تقرير الرقابة والتفتيش على المحطات', orientation: 'landscape' },
  { id: 'rep-36', num: 36, group: 'تقارير المواد البترولية ومحطات الوقود', title: '٣٦. تقرير حركة المواد البترولية', orientation: 'landscape' },
  { id: 'rep-37', num: 37, group: 'تقارير المواد البترولية ومحطات الوقود', title: '٣٧. تقرير نصيب المستفيد من المواد البترولية', orientation: 'portrait' },
  { id: 'rep-38', num: 38, group: 'تقارير المواد البترولية ومحطات الوقود', title: '٣٨. تقرير المستفيدين في ٢٠٢٣ و٢٠٢٤ و٢٠٢٥ (وقود)', orientation: 'landscape' },
  { id: 'rep-39', num: 39, group: 'تقارير المواد البترولية ومحطات الوقود', title: '٣٩. تقرير فروق الجرد والأرصدة بمحطات الوقود', orientation: 'portrait' },
];

export default function InternalTradeAlertsReportsSettingsView({
  activeScreen,
  currentUserName,
  todayRef,
  settings,
  onUpdateSettings,
  alerts,
  closedAlertIds,
  onCloseAlert,
  establishments,
  activities,
  licenses,
  campaigns,
  reports,
  settlements,
  seizures,
  seizureMovements,
  commodities,
  priceObservations,
  butaneAllocations,
  petroleumAllocations,
  fuelStations,
  fuelMovements,
  fuelInspections,
  butaneWarehouses,
  butaneWarehouseMovements,
  butaneDistributors,
  butaneDistributorMovements,
  onNotify,
}: InternalTradeAlertsReportsSettingsViewProps) {
  // فلاتر التنبيهات الذكية
  const [alertDomainFilter, setAlertDomainFilter] = useState<string>('ALL');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>('ALL');
  const [resolutionInputMap, setResolutionInputMap] = useState<Record<string, string>>({});
  const [customAlerts, setCustomAlerts] = useState<InternalTradeAlertRecord[]>([]);
  const [editedAlertsMap, setEditedAlertsMap] = useState<Record<string, InternalTradeAlertRecord>>({});
  const [deletedAlertIds, setDeletedAlertIds] = useState<Record<string, boolean>>({});
  const [customReportExtraRows, setCustomReportExtraRows] = useState<Record<string, (string | number)[][]>>({});
  const [deletedReportRowKeys, setDeletedReportRowKeys] = useState<Record<string, boolean>>({});

  // نافذة العرض والتعديل والإضافة الموحدة
  const [crudModalState, setCrudModalState] = useState<{
    title: string;
    mode: 'view' | 'edit';
    record: Record<string, unknown>;
    fields: EditableFieldSpec[];
    onSave?: (updated: Record<string, unknown>) => void;
  } | null>(null);

  // فلاتر مركز التقارير
  const [selectedReportId, setSelectedReportId] = useState<string>('rep-01');
  const [reportSearch, setReportSearch] = useState<string>('');
  const [reportVillageFilter, setReportVillageFilter] = useState<string>('ALL');
  const [reportDateFrom, setReportDateFrom] = useState<string>('2026-01-01');
  const [reportDateTo, setReportDateTo] = useState<string>(todayRef);
  const [showPrintReportModal, setShowPrintReportModal] = useState<boolean>(false);

  // إعدادات إضافة تصنيف منشأة أو نوع حملة جديد
  const [newEstCategory, setNewEstCategory] = useState<string>('');
  const [newCampaignType, setNewCampaignType] = useState<string>('');
  const [newLicTitle, setNewLicTitle] = useState<string>('');
  const [newLicAuth, setNewLicAuth] = useState<string>('');

  const allVillages = useMemo(() => {
    const s = new Set<string>();
    establishments.forEach((e) => s.add(e.village));
    butaneAllocations.forEach((b) => s.add(b.village));
    return Array.from(s);
  }, [establishments, butaneAllocations]);

  const alertCrudFields: EditableFieldSpec[] = [
    { key: 'alertNumber', label: 'رقم التنبيه', readOnly: true },
    {
      key: 'domainCategory',
      label: 'مجموعة التنبيه',
      type: 'select',
      options: [
        'تنبيهات المنشآت والتراخيص',
        'تنبيهات الحملات والمخالفات',
        'تنبيهات الأسواق والأسعار',
        'تنبيهات البوتاجاز والوقود',
      ],
    },
    { key: 'alertType', label: 'نوع التنبيه' },
    { key: 'linkedRecordCode', label: 'كود السجل المرتبط' },
    { key: 'linkedRecordTitle', label: 'اسم السجل المرتبط' },
    { key: 'village', label: 'القرية' },
    {
      key: 'severity',
      label: 'درجة الخطورة',
      type: 'select',
      options: ['عاجل', 'مرتفع', 'متوسط', 'منخفض', 'معلوماتي'],
    },
    { key: 'responsibleEmployee', label: 'الموظف المختص' },
    { key: 'requiredAction', label: 'الإجراء المطلوب' },
    {
      key: 'status',
      label: 'حالة التنبيه',
      type: 'select',
      options: ['مفتوح', 'قيد المعالجة', 'تمت المعالجة ومغلق'],
    },
  ];

  const handleOpenNewAlertModal = () => {
    const newAlert: InternalTradeAlertRecord = {
      id: `alt-custom-${Date.now()}`,
      alertNumber: `ALT-2026-${String(alerts.length + customAlerts.length + 1).padStart(3, '0')}`,
      domainCategory: 'تنبيهات المنشآت والتراخيص',
      alertType: 'تنبيه رقابي جديد',
      sourceSection: 'سجل المحلات والمنشآت التجارية',
      linkedRecordCode: 'EST-2026-0001',
      linkedRecordTitle: 'منشأة تجارية تحت المتابعة',
      supplyAdministration: 'إدارة تموين مركز المحلة الكبرى',
      village: 'محلة أبو علي',
      severity: 'مرتفع',
      createdAt: todayRef,
      responsibleEmployee: currentUserName,
      requiredAction: 'مرور تفتيشي ومراجعة التراخيص والبطاقة الضريبية والسجل التجاري',
      dueDate: todayRef,
      status: 'مفتوح',
    };
    setCrudModalState({
      title: 'إضافة تنبيه رقابي جديد',
      mode: 'edit',
      record: newAlert as unknown as Record<string, unknown>,
      fields: alertCrudFields,
      onSave: (updated) => {
        setCustomAlerts((prev) => [updated as unknown as InternalTradeAlertRecord, ...prev]);
        setCrudModalState(null);
        onNotify('تمت إضافة التنبيه الرقابي الجديد بنجاح.');
      },
    });
  };

  // ==================== ١٨. شاشة نظام التنبيهات الذكية ====================
  if (activeScreen === 'smart_alerts') {
    const mergedAlerts = [...customAlerts, ...alerts]
      .filter((a) => !deletedAlertIds[a.id])
      .map((a) => editedAlertsMap[a.id] || a);

    const enrichedAlerts = mergedAlerts.map((a) => {
      const closed = closedAlertIds[a.id];
      return closed
        ? { ...a, status: 'تمت المعالجة ومغلق' as const, closedAt: closed.closedAt, resolutionNotes: closed.notes }
        : a;
    });

    const filteredAlerts = enrichedAlerts.filter(
      (a) =>
        (alertDomainFilter === 'ALL' || a.domainCategory === alertDomainFilter) &&
        (alertSeverityFilter === 'ALL' || a.severity === alertSeverityFilter)
    );

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#102A43]">
              ١٨. محرك التنبيهات الذكية المركزي لقسم التجارة الداخلية
            </h3>
            <p className="text-[11px] font-bold text-slate-600">
              يراقب التراخيص والأنشطة والحملات والمضبوطات وأسعار السلع وفروق جرد الوقود والبوتاجاز وفق الحدود الزمنية والكمية المعتمدة بالإعدادات
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={alertDomainFilter}
              onChange={(e) => setAlertDomainFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 font-black"
            >
              <option value="ALL">جميع مجموعات التنبيهات ({toArabicNumerals(enrichedAlerts.length)})</option>
              <option value="تنبيهات المنشآت والتراخيص">تنبيهات المنشآت والتراخيص</option>
              <option value="تنبيهات الحملات والمخالفات">تنبيهات الحملات والمخالفات</option>
              <option value="تنبيهات الأسواق والأسعار">تنبيهات الأسواق والأسعار</option>
              <option value="تنبيهات البوتاجاز والوقود">تنبيهات البوتاجاز والوقود</option>
            </select>
            <select
              value={alertSeverityFilter}
              onChange={(e) => setAlertSeverityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 font-black"
            >
              <option value="ALL">جميع درجات الخطورة</option>
              <option value="عاجل">عاجل</option>
              <option value="مرتفع">مرتفع</option>
              <option value="متوسط">متوسط</option>
              <option value="منخفض">منخفض</option>
              <option value="معلوماتي">معلوماتي</option>
            </select>
            <button
              type="button"
              onClick={handleOpenNewAlertModal}
              className="px-3.5 py-1.5 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة تنبيه جديد</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#102A43] text-white">
                <th className="p-2.5 border border-slate-700">رقم التنبيه</th>
                <th className="p-2.5 border border-slate-700">المجموعة / نوع التنبيه</th>
                <th className="p-2.5 border border-slate-700">السجل المرتبط والقرية</th>
                <th className="p-2.5 border border-slate-700 text-center">درجة الخطورة</th>
                <th className="p-2.5 border border-slate-700">المسؤول والإجراء المطلوب</th>
                <th className="p-2.5 border border-slate-700 text-center">الحالة والمعالجة</th>
                <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((al) => (
                <tr key={al.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2.5 num-cell font-black text-[#164E83]">{al.alertNumber}</td>
                  <td className="p-2.5">
                    <span className="text-[10.5px] font-bold text-slate-500 block">{al.domainCategory}</span>
                    <span className="font-black text-[#102A43]">{al.alertType}</span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-black text-slate-800 block">{al.linkedRecordTitle}</span>
                    <span className="text-[10.5px] font-bold text-slate-500">{al.village} · كود: {al.linkedRecordCode}</span>
                  </td>
                  <td className="p-2.5 text-center font-black">
                    <span
                      className={
                        al.severity === 'عاجل'
                          ? 'text-red-700'
                          : al.severity === 'مرتفع'
                          ? 'text-amber-700'
                          : 'text-[#164E83]'
                      }
                    >
                      {al.severity}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span className="font-black text-[#102A43] block">{al.responsibleEmployee}</span>
                    <span className="text-[11px] font-bold text-slate-600">{al.requiredAction}</span>
                  </td>
                  <td className="p-2.5 text-center">
                    {al.status === 'تمت المعالجة ومغلق' ? (
                      <div className="text-emerald-800 font-black text-[11px]">
                        <span>مغلق ({al.closedAt})</span>
                        <span className="block text-[10px] font-bold text-slate-600">{al.resolutionNotes}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="ملاحظة الإجراء..."
                          value={resolutionInputMap[al.id] || ''}
                          onChange={(e) =>
                            setResolutionInputMap((prev) => ({ ...prev, [al.id]: e.target.value }))
                          }
                          className="px-2 py-1 border rounded text-[10.5px] font-bold w-32"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onCloseAlert(
                              al.id,
                              resolutionInputMap[al.id] || 'تم اتخاذ الإجراء القانوني والرقابي اللازم'
                            )
                          }
                          className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10.5px] font-black cursor-pointer whitespace-nowrap"
                        >
                          إغلاق التنبيه
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-2.5 text-center">
                    <TableActionButtons
                      onView={() =>
                        setCrudModalState({
                          title: `عرض تفاصيل التنبيه: ${al.alertNumber}`,
                          mode: 'view',
                          record: al as unknown as Record<string, unknown>,
                          fields: alertCrudFields,
                        })
                      }
                      onAdd={handleOpenNewAlertModal}
                      onEdit={() =>
                        setCrudModalState({
                          title: `تعديل التنبيه: ${al.alertNumber}`,
                          mode: 'edit',
                          record: al as unknown as Record<string, unknown>,
                          fields: alertCrudFields,
                          onSave: (updated) => {
                            const updatedRec = updated as unknown as InternalTradeAlertRecord;
                            setEditedAlertsMap((prev) => ({ ...prev, [al.id]: updatedRec }));
                            setCrudModalState(null);
                            onNotify(`تم تحديث بيانات التنبيه (${al.alertNumber}) بنجاح.`);
                          },
                        })
                      }
                      onDelete={() => {
                        setDeletedAlertIds((prev) => ({ ...prev, [al.id]: true }));
                        onNotify(`تم حذف التنبيه (${al.alertNumber}) من السجل.`);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {crudModalState && (
          <UniversalCrudModal
            title={crudModalState.title}
            mode={crudModalState.mode}
            record={crudModalState.record}
            fields={crudModalState.fields}
            todayRef={todayRef}
            onClose={() => setCrudModalState(null)}
            onSave={crudModalState.onSave}
          />
        )}
      </div>
    );
  }

  // ==================== ١٩. مركز تقارير التجارة الداخلية والطباعة ====================
  if (activeScreen === 'reports_center') {
    const activeReport = ALL_39_REPORTS.find((r) => r.id === selectedReportId) || ALL_39_REPORTS[0];
    const filteredReportDefinitions = ALL_39_REPORTS.filter(
      (r) => !reportSearch || r.title.includes(reportSearch) || r.group.includes(reportSearch)
    );

    // بناء جدول البيانات الديناميكي للتقرير المختار
    const generateReportTableData = (): { headers: string[]; rows: (string | number)[][]; summaryText: string } => {
      const vFilter = (v: string) => reportVillageFilter === 'ALL' || v === reportVillageFilter;

      switch (activeReport.num) {
        case 1:
        case 2: {
          const rows = establishments
            .filter((e) => vFilter(e.village))
            .map((e) => [
              e.autoCode,
              e.fileNumber,
              e.name,
              e.ownerName,
              e.category,
              e.village,
              e.taxCardNumber,
              e.taxCardExpiryDate,
              e.commercialRegisterNumber,
              e.commercialRegisterExpiryDate,
              e.licenseNumber,
              e.licenseExpiryDate,
              e.status,
            ]);
          return {
            headers: [
              'كود المنشأة',
              'رقم الملف',
              'اسم المنشأة',
              'صاحب المنشأة',
              'التصنيف',
              'القرية',
              'رقم البطاقة الضريبية',
              'انتهاء البطاقة الضريبية',
              'رقم السجل التجاري',
              'انتهاء السجل التجاري',
              'رقم الترخيص',
              'انتهاء الترخيص',
              'الحالة',
            ],
            rows,
            summaryText: `إجمالي المنشآت بالتقرير: ${toArabicNumerals(rows.length)} منشأة تجارية`,
          };
        }
        case 3: {
          const rows = activities.map((a) => [a.code, a.name, a.category, a.nature, a.competentAuthority, a.status]);
          return {
            headers: ['كود النشاط', 'اسم النشاط', 'التصنيف', 'طبيعة النشاط', 'الجهة المختصة بالترخيص', 'الحالة'],
            rows,
            summaryText: `إجمالي الأنشطة التجارية المسجلة: ${toArabicNumerals(rows.length)} نشاطاً`,
          };
        }
        case 4: {
          const rows = establishments
            .filter((e) => !e.isLicensed && vFilter(e.village))
            .map((e) => [e.autoCode, e.name, e.ownerName, e.category, e.village, e.taxCardNumber, e.commercialRegisterNumber, e.unregisteredActivityDetails || 'بدون ترخيص']);
          return {
            headers: ['كود المنشأة', 'اسم المنشأة', 'صاحب المنشأة', 'التصنيف', 'القرية', 'رقم البطاقة الضريبية', 'رقم السجل التجاري', 'الملاحظة الرقابية'],
            rows,
            summaryText: `إجمالي المنشآت غير المرخصة: ${toArabicNumerals(rows.length)} منشأة`,
          };
        }
        case 5: {
          const rows = establishments
            .filter((e) => e.taxCardExpiryDate < todayRef && vFilter(e.village))
            .map((e) => [e.autoCode, e.name, e.ownerName, e.taxCardNumber, e.taxCardExpiryDate, e.commercialRegisterNumber, e.licenseNumber, e.village]);
          return {
            headers: ['كود المنشأة', 'اسم المنشأة', 'صاحب المنشأة', 'رقم البطاقة الضريبية', 'تاريخ انتهاء البطاقة', 'رقم السجل التجاري', 'رقم الترخيص', 'القرية'],
            rows,
            summaryText: `إجمالي المنشآت ذات البطاقة الضريبية المنتهية: ${toArabicNumerals(rows.length)} منشأة`,
          };
        }
        case 6: {
          const rows = establishments
            .filter((e) => e.commercialRegisterExpiryDate < todayRef && vFilter(e.village))
            .map((e) => [e.autoCode, e.name, e.ownerName, e.commercialRegisterNumber, e.commercialRegisterExpiryDate, e.taxCardNumber, e.licenseNumber, e.village]);
          return {
            headers: ['كود المنشأة', 'اسم المنشأة', 'صاحب المنشأة', 'رقم السجل التجاري', 'تاريخ انتهاء السجل', 'رقم البطاقة الضريبية', 'رقم الترخيص', 'القرية'],
            rows,
            summaryText: `إجمالي المنشآت ذات السجل التجاري المنتهي: ${toArabicNumerals(rows.length)} منشأة`,
          };
        }
        case 7:
        case 8: {
          const rows = licenses
            .filter((l) => vFilter(l.village) && (activeReport.num === 7 ? l.status === 'منتهي' : l.status.includes('قارب')))
            .map((l) => [l.licenseNumber, l.establishmentName, l.ownerName, l.taxCardNumber, l.taxCardExpiryDate, l.commercialRegisterNumber, l.commercialRegisterExpiryDate, l.licenseType, l.expiryDate, l.status]);
          return {
            headers: ['رقم الترخيص', 'المنشأة', 'صاحب المنشأة', 'البطاقة الضريبية', 'انتهاء البطاقة', 'السجل التجاري', 'انتهاء السجل', 'نوع الترخيص', 'انتهاء الترخيص', 'الحالة'],
            rows,
            summaryText: `إجمالي التراخيص بالتقرير: ${toArabicNumerals(rows.length)} ترخيصاً`,
          };
        }
        case 9:
        case 10: {
          const rows = campaigns
            .filter((c) => vFilter(c.village))
            .map((c) => [c.campaignNumber, c.campaignDate, c.campaignType, c.campaignLeader, c.village, c.inspectedEstablishmentsCount, c.reportsCount, c.seizuresCount, c.status]);
          return {
            headers: ['رقم الحملة', 'التاريخ', 'نوع الحملة', 'رئيس الحملة', 'القرية', 'المنشآت المفحوصة', 'المحاضر', 'المضبوطات', 'الحالة'],
            rows,
            summaryText: `إجمالي الحملات التموينية: ${toArabicNumerals(rows.length)} حملة`,
          };
        }
        case 11:
        case 12:
        case 13: {
          const rows = reports
            .filter((r) => vFilter(r.village))
            .map((r) => [r.reportNumber, r.reportDate, r.establishmentName, r.ownerName, r.issuingAuthority, r.items.map((i) => i.violationTitle).join(' + '), r.totalFineAmountEgp, r.reportStatus]);
          const totalFines = reports.filter((r) => vFilter(r.village)).reduce((a, b) => a + b.totalFineAmountEgp, 0);
          return {
            headers: ['رقم المحضر', 'التاريخ', 'المنشأة', 'المخالف', 'الجهة المحررة', 'المخالفات', 'المبلغ المستحق (ج.م)', 'حالة المحضر'],
            rows,
            summaryText: `إجمالي المحاضر: ${toArabicNumerals(rows.length)} محضراً — إجمالي المبالغ المستحقة: ${formatArabicCurrency(totalFines)}`,
          };
        }
        case 14:
        case 15: {
          const rows = settlements
            .filter((s) => vFilter(s.village))
            .map((s) => [s.settlementRequestNumber, s.reportNumber, s.establishmentName, s.approvedSettlementAmountEgp, s.paidAmountEgp, s.remainingAmountEgp, s.paymentReceiptNumber || '—', s.status]);
          const totalPaid = settlements.filter((s) => vFilter(s.village)).reduce((a, b) => a + b.paidAmountEgp, 0);
          const totalRem = settlements.filter((s) => vFilter(s.village)).reduce((a, b) => a + b.remainingAmountEgp, 0);
          return {
            headers: ['رقم طلب التصالح', 'رقم المحضر', 'المنشأة', 'قيمة التصالح المعتمدة', 'المسدد الفعلي', 'المتبقي', 'رقم الإيصال', 'الحالة'],
            rows,
            summaryText: `إجمالي المحصل الفعلي بإيصالات: ${formatArabicCurrency(totalPaid)} — المتبقي تحت التحصيل: ${formatArabicCurrency(totalRem)}`,
          };
        }
        case 16:
        case 17:
        case 18: {
          const filteredSz = seizures.filter(
            (sz) => vFilter(sz.village) && (activeReport.num !== 18 || !sz.disposalDecisionNumber)
          );
          const rows = filteredSz.map((sz) => [sz.seizureNumber, sz.reportNumber, sz.establishmentName, sz.productName, `${sz.currentActualBalance} ${sz.unit}`, sz.estimatedValueEgp, sz.custodyLocation, sz.legalStatus]);
          return {
            headers: ['رقم المضبوطات', 'رقم المحضر', 'المنشأة', 'السلعة المضبوطة', 'الرصيد الفعلي', 'القيمة التقديرية (ج.م)', 'مكان التحفظ', 'الحالة القانونية'],
            rows,
            summaryText: `إجمالي سجلات المضبوطات والتحفظات: ${toArabicNumerals(rows.length)} سجل عهدة`,
          };
        }
        case 19:
        case 20:
        case 21:
        case 22:
        case 23: {
          const filteredObs = priceObservations.filter(
            (o) => vFilter(o.village) && (activeReport.num !== 22 || o.availabilityStatus !== 'متوفر')
          );
          const rows = filteredObs.map((o) => [o.commodityName, o.marketName, o.village, o.minPriceEgp, o.maxPriceEgp, o.observedPriceEgp, o.officialPriceEgp || 'حر', o.availabilityStatus]);
          return {
            headers: ['السلعة', 'السوق', 'القرية', 'أقل سعر', 'أعلى سعر', 'السعر المرصود', 'السعر الرسمي', 'حالة التوافر'],
            rows,
            summaryText: `إجمالي عمليات رصد الأسواق والأسعار: ${toArabicNumerals(rows.length)} عملية رصد`,
          };
        }
        case 24: {
          const rows = butaneWarehouses
            .filter((w) => vFilter(w.village))
            .map((w) => [w.warehouseCode, w.warehouseName, w.ownerName, w.village, w.taxCardNumber, w.taxCardExpiryDate, w.commercialRegisterNumber, w.commercialRegisterExpiryDate, w.licenseNumber, w.licenseExpiryDate, w.allocatedMonthlyQuota, w.operationStatus]);
          return {
            headers: ['كود المستودع', 'اسم المستودع', 'المالك', 'القرية', 'البطاقة الضريبية', 'انتهاء البطاقة', 'السجل التجاري', 'انتهاء السجل', 'رقم الترخيص', 'انتهاء الترخيص', 'الحصة المقررة', 'الحالة'],
            rows,
            summaryText: `تقرير مستودعات البوتاجاز — إجمالي المستودعات: ${toArabicNumerals(rows.length)}`,
          };
        }
        case 25: {
          const rows = butaneDistributors
            .filter((d) => vFilter(d.village))
            .map((d) => [d.distributorCode, d.distributorName, d.affiliatedWarehouseName, d.village, d.taxCardNumber, d.taxCardExpiryDate, d.commercialRegisterNumber, d.commercialRegisterExpiryDate, d.permitOrLicenseNumber, d.licenseExpiryDate, d.allocatedCylindersQuota, d.status]);
          return {
            headers: ['كود الموزع', 'اسم الموزع', 'المستودع التابع له', 'القرية', 'البطاقة الضريبية', 'انتهاء البطاقة', 'السجل التجاري', 'انتهاء السجل', 'رقم الترخيص', 'انتهاء الترخيص', 'الحصة المقررة', 'الحالة'],
            rows,
            summaryText: `تقرير سجل موزعي البوتاجاز — إجمالي الموزعين: ${toArabicNumerals(rows.length)}`,
          };
        }
        case 26:
        case 27:
        case 28:
        case 29:
        case 30:
        case 31:
        case 32: {
          const targetYear = activeReport.num === 29 ? 2023 : activeReport.num === 30 ? 2024 : 2025;
          const rows = butaneAllocations
            .filter((b) => vFilter(b.village))
            .map((b) => {
              const yh = b.yearlyHistory.find((y) => y.year === targetYear) || b.yearlyHistory[b.yearlyHistory.length - 1];
              const share = yh && yh.beneficiariesCount > 0 ? (yh.distributedCylinders / yh.beneficiariesCount).toFixed(2) : '0';
              return [b.village, b.localUnit, b.taxCardNumber, b.taxCardExpiryDate, b.commercialRegisterNumber, b.commercialRegisterExpiryDate, b.licenseNumber, b.licenseExpiryDate, targetYear, yh?.beneficiariesCount || 0, yh?.allocatedCylinders || 0, yh?.distributedCylinders || 0, share];
            });
          return {
            headers: ['القرية', 'الوحدة المحلية', 'البطاقة الضريبية', 'انتهاء البطاقة', 'السجل التجاري', 'انتهاء السجل', 'رقم الترخيص', 'انتهاء الترخيص', 'السنة', 'عدد المستفيدين', 'الحصة المقررة', 'الموزع الفعلي', 'نصيب المستفيد (أسطوانة)'],
            rows,
            summaryText: `تقرير البوتاجاز والمستفيدين لعام ${toArabicNumerals(targetYear)} — عدد القرى: ${toArabicNumerals(rows.length)}`,
          };
        }
        case 33: {
          const rows = fuelStations
            .filter((s) => vFilter(s.village))
            .map((s) => [s.stationCode, s.stationName, s.ownerOrManagerName, s.operatingCompany, s.village, s.taxCardNumber, s.taxCardExpiryDate, s.commercialRegisterNumber, s.commercialRegisterExpiryDate, s.licenseNumber, s.licenseExpiryDate, s.operationStatus]);
          return {
            headers: ['كود المحطة', 'اسم المحطة', 'صاحب المحطة', 'شركة التسويق', 'القرية', 'البطاقة الضريبية', 'انتهاء البطاقة', 'السجل التجاري', 'انتهاء السجل', 'رقم الترخيص', 'انتهاء الترخيص', 'الحالة'],
            rows,
            summaryText: `تقرير محطات الوقود — إجمالي المحطات: ${toArabicNumerals(rows.length)}`,
          };
        }
        default: {
          const rows = fuelMovements
            .filter((m) => vFilter(m.village))
            .map((m) => [m.movementDate, m.stationName, m.village, m.productType, m.openingBalanceLiters, m.receivedQuantityLiters, m.dispensedQuantityLiters, m.bookClosingBalanceLiters, m.actualTankMeasurementLiters, m.inventoryDiffLiters]);
          return {
            headers: ['التاريخ', 'محطة الوقود', 'القرية', 'المنتج', 'افتتاحي', 'وارد', 'منصرف', 'رصيد دفتري', 'قياس فعلي', 'فرق الجرد'],
            rows,
            summaryText: `تقرير المواد البترولية ومحطات الوقود (سجل ٢١ بترول) — إجمالي الحركات: ${toArabicNumerals(rows.length)}`,
          };
        }
      }
    };

    const baseReportData = generateReportTableData();
    const extraRowsForReport = customReportExtraRows[activeReport.id] || [];
    const reportRowsWithExtras = [...extraRowsForReport, ...baseReportData.rows].filter(
      (_, idx) => !deletedReportRowKeys[`${activeReport.id}-${idx}`]
    );
    const reportData = {
      ...baseReportData,
      rows: reportRowsWithExtras,
    };

    const reportRowFields: EditableFieldSpec[] = reportData.headers.map((h, idx) => ({
      key: `col_${idx}`,
      label: h,
      type: h.includes('انتهاء') || h.includes('التاريخ') ? 'date' : 'text',
    }));

    const handleAddReportRow = () => {
      const blankRecord: Record<string, unknown> = {};
      reportData.headers.forEach((h, idx) => {
        blankRecord[`col_${idx}`] = h.includes('انتهاء') || h.includes('التاريخ') ? todayRef : '';
      });
      setCrudModalState({
        title: `إضافة سجل جديد في: ${activeReport.title}`,
        mode: 'edit',
        record: blankRecord,
        fields: reportRowFields,
        onSave: (updated) => {
          const newRow = reportData.headers.map((_, idx) => String(updated[`col_${idx}`] ?? ''));
          setCustomReportExtraRows((prev) => ({
            ...prev,
            [activeReport.id]: [newRow, ...(prev[activeReport.id] || [])],
          }));
          setCrudModalState(null);
          onNotify('تمت إضافة السجل الجديد إلى جدول التقرير بنجاح.');
        },
      });
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-[#102A43]">
                ١٩. مركز تقارير وطباعة قسم التجارة الداخلية (٣٩ تقريراً حكومياً رسمياً)
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                اختر التقرير وحدد القرية والفترة الزمنية لمعاينته وتصديره إلى Excel (UTF-8) أو طباعته رسمياً A4
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  exportCsvUtf8Bom(
                    `${activeReport.title.replace(/\s+/g, '_')}.csv`,
                    reportData.headers,
                    reportData.rows
                  );
                  onNotify(`تم تصدير (${activeReport.title}) إلى ملف Excel بنجاح.`);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير التقرير Excel (UTF-8)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPrintReportModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>معاينة وطباعة رسمية A4 / PDF</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
            {/* قائمة التقارير الـ 39 القابلة للبحث */}
            <div className="lg:col-span-4 bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2.5 max-h-[540px] overflow-y-auto">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="ابحث في ٣٩ تقريراً..."
                  className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                {filteredReportDefinitions.map((rep) => (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => setSelectedReportId(rep.id)}
                    className={`w-full text-right px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-between ${
                      selectedReportId === rep.id
                        ? 'bg-[#102A43] text-[#C6A15B]'
                        : 'hover:bg-white text-slate-800'
                    }`}
                  >
                    <span>{rep.title}</span>
                    <span className="text-[10px] opacity-75">{rep.orientation === 'landscape' ? 'أفقي' : 'عمودي'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* معاينة التقرير المختار */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10.5px] font-bold text-[#164E83] block">{activeReport.group}</span>
                  <h4 className="text-sm font-black text-[#102A43]">{activeReport.title}</h4>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={reportVillageFilter}
                    onChange={(e) => setReportVillageFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
                  >
                    <option value="ALL">جميع القرى</option>
                    {allVillages.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-300 font-bold bg-white"
                  />
                  <input
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#102A43] text-white">
                      {reportData.headers.map((h) => (
                        <th key={h} className="p-2.5 border border-slate-700">{h}</th>
                      ))}
                      <th className="p-2.5 border border-slate-700 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row, rIdx) => {
                      const rowRecordObj: Record<string, unknown> = {};
                      row.forEach((cell, cIdx) => {
                        rowRecordObj[`col_${cIdx}`] = cell;
                      });
                      return (
                        <tr key={rIdx} className="border-b border-slate-200 hover:bg-slate-50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2.5 font-bold text-slate-800">
                              {typeof cell === 'number' ? formatArabicNumber(cell) : toArabicNumerals(String(cell))}
                            </td>
                          ))}
                          <td className="p-2.5 text-center">
                            <TableActionButtons
                              onView={() =>
                                setCrudModalState({
                                  title: `عرض تفاصيل السجل — ${activeReport.title}`,
                                  mode: 'view',
                                  record: rowRecordObj,
                                  fields: reportRowFields,
                                })
                              }
                              onAdd={handleAddReportRow}
                              onEdit={() =>
                                setCrudModalState({
                                  title: `تعديل السجل — ${activeReport.title}`,
                                  mode: 'edit',
                                  record: rowRecordObj,
                                  fields: reportRowFields,
                                  onSave: (updated) => {
                                    const updatedRow = reportData.headers.map((_, idx) => String(updated[`col_${idx}`] ?? ''));
                                    setCustomReportExtraRows((prev) => ({
                                      ...prev,
                                      [activeReport.id]: [updatedRow, ...(prev[activeReport.id] || [])],
                                    }));
                                    setDeletedReportRowKeys((prev) => ({
                                      ...prev,
                                      [`${activeReport.id}-${rIdx}`]: true,
                                    }));
                                    setCrudModalState(null);
                                    onNotify('تم حفظ تعديلات السجل في التقرير.');
                                  },
                                })
                              }
                              onDelete={() => {
                                setDeletedReportRowKeys((prev) => ({
                                  ...prev,
                                  [`${activeReport.id}-${rIdx}`]: true,
                                }));
                                onNotify('تم حذف السجل من جدول التقرير الحالي.');
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-[#102A43]/5 p-3 rounded-xl border border-[#102A43]/15 text-xs font-black text-[#102A43] flex items-center justify-between">
                <span>{reportData.summaryText}</span>
                <span>إعداد: {currentUserName} · التاريخ: {formatDateArabic(todayRef)}</span>
              </div>
            </div>
          </div>
        </div>

        {showPrintReportModal && (
          <OfficialPrintModal
            title={activeReport.title}
            subtitle={`قسم التجارة الداخلية — إدارة تموين مركز المحلة الكبرى — الفترة: ${formatDateArabic(reportDateFrom)} إلى ${formatDateArabic(reportDateTo)}`}
            docNumber={`TRD-REP-${activeReport.num}-${todayRef}`}
            printedBy={currentUserName}
            todayRef={todayRef}
            onClose={() => setShowPrintReportModal(false)}
          >
            <div className="space-y-3">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {reportData.headers.map((h) => (
                      <th key={h} className="p-2 border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 border font-bold">
                          {typeof cell === 'number' ? formatArabicNumber(cell) : toArabicNumerals(String(cell))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2.5 bg-slate-100 border font-black text-xs">
                {reportData.summaryText}
              </div>
            </div>
          </OfficialPrintModal>
        )}

        {crudModalState && (
          <UniversalCrudModal
            title={crudModalState.title}
            mode={crudModalState.mode}
            record={crudModalState.record}
            fields={crudModalState.fields}
            todayRef={todayRef}
            onClose={() => setCrudModalState(null)}
            onSave={crudModalState.onSave}
          />
        )}
      </div>
    );
  }

  // ==================== ٢٠. شاشة إعدادات قسم التجارة الداخلية وقوائم البيانات ====================
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border-2 border-[#102A43]/20 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-black text-[#102A43]">
            ٢٠. إعدادات قسم التجارة الداخلية وقوائم البيانات والتصنيفات
          </h3>
          <p className="text-[11px] font-bold text-slate-600">
            تعديل مواعيد تنبيهات التراخيص (٩٠ / ٦٠ / ٣٠ / ١٥ / ٧ أيام)، الأوزان المعتمدة، حدود الأمان، وقوائم التصنيفات دون تعديل الكود
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="font-black text-[#102A43] block">
              حدود الأيام لتنبيهات انتهاء التراخيص (مفصولة بفاصلة)
            </label>
            <input
              type="text"
              value={settings.licenseAlertThresholdsDays.join(', ')}
              onChange={(e) => {
                const nums = e.target.value
                  .split(',')
                  .map((x) => Number(x.trim()))
                  .filter((n) => !Number.isNaN(n) && n > 0);
                if (nums.length > 0) {
                  onUpdateSettings({ ...settings, licenseAlertThresholdsDays: nums });
                }
              }}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
            />
            <span className="text-[10.5px] font-bold text-slate-500 block">
              القيم الافتراضية: ٩٠، ٦٠، ٣٠، ١٥، ٧ أيام قبل الانتهاء
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="font-black text-[#102A43] block">
              وزن أسطوانة البوتاجاز المنزلية المعتمد (كجم)
            </label>
            <input
              type="number"
              step="0.5"
              value={settings.approvedDomesticCylinderWeightKg}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  approvedDomesticCylinderWeightKg: Number(e.target.value) || 12.5,
                })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
            />
            <span className="text-[10.5px] font-bold text-slate-500 block">
              يستخدم عند احتساب نصيب الفرد بوحدة الكيلوجرام
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="font-black text-[#102A43] block">
              حد تنبيه عدم المرور على المنشأة (بالأيام)
            </label>
            <input
              type="number"
              value={settings.uninspectedEstablishmentMaxDays}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  uninspectedEstablishmentMaxDays: Number(e.target.value) || 45,
                })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-black bg-white"
            />
            <span className="text-[10.5px] font-bold text-slate-500 block">
              يطلق تنبيهاً إذا لم يتم المرور على المنشأة خلال هذه المدة
            </span>
          </div>
        </div>

        {/* إدارة القوائم المرنة (تصنيفات المنشآت، أنواع التراخيص والجهة المختصة، أنواع الحملات) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-black text-[#102A43]">تصنيفات المنشآت التجارية ({toArabicNumerals(settings.establishmentCategories.length)})</h4>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="تصنيف منشأة جديد..."
                value={newEstCategory}
                onChange={(e) => setNewEstCategory(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border rounded-lg font-bold bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newEstCategory.trim()) return;
                  onUpdateSettings({
                    ...settings,
                    establishmentCategories: [...settings.establishmentCategories, newEstCategory.trim()],
                  });
                  setNewEstCategory('');
                  onNotify('تمت إضافة تصنيف المنشآت الجديد بنجاح.');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
              >
                إضافة
              </button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-bold text-slate-700">
              {settings.establishmentCategories.map((c) => (
                <div key={c} className="bg-white px-2.5 py-1 rounded border border-slate-200">{c}</div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-black text-[#102A43]">أنواع التراخيص والجهات المختصة ({toArabicNumerals(settings.licenseTypes.length)})</h4>
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="نوع الترخيص..."
                value={newLicTitle}
                onChange={(e) => setNewLicTitle(e.target.value)}
                className="w-full px-2.5 py-1 border rounded-lg font-bold bg-white"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="الجهة المختصة بإصداره..."
                  value={newLicAuth}
                  onChange={(e) => setNewLicAuth(e.target.value)}
                  className="flex-1 px-2.5 py-1 border rounded-lg font-bold bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newLicTitle.trim() || !newLicAuth.trim()) return;
                    onUpdateSettings({
                      ...settings,
                      licenseTypes: [
                        ...settings.licenseTypes,
                        { title: newLicTitle.trim(), competentAuthority: newLicAuth.trim() },
                      ],
                    });
                    setNewLicTitle('');
                    setNewLicAuth('');
                    onNotify('تمت إضافة نوع الترخيص وربطه بالجهة المختصة.');
                  }}
                  className="px-3 py-1 rounded-lg bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
                >
                  إضافة
                </button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-[10.5px] font-bold text-slate-700">
              {settings.licenseTypes.map((lt) => (
                <div key={lt.title} className="bg-white px-2.5 py-1 rounded border border-slate-200">
                  <span className="font-black text-[#102A43]">{lt.title}</span> — {lt.competentAuthority}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-black text-[#102A43]">أنواع الحملات التموينية ({toArabicNumerals(settings.campaignTypes.length)})</h4>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="نوع حملة جديد..."
                value={newCampaignType}
                onChange={(e) => setNewCampaignType(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border rounded-lg font-bold bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCampaignType.trim()) return;
                  onUpdateSettings({
                    ...settings,
                    campaignTypes: [...settings.campaignTypes, newCampaignType.trim()],
                  });
                  setNewCampaignType('');
                  onNotify('تمت إضافة نوع الحملة الجديد.');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#102A43] text-[#C6A15B] font-black cursor-pointer"
              >
                إضافة
              </button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-bold text-slate-700">
              {settings.campaignTypes.map((c) => (
                <div key={c} className="bg-white px-2.5 py-1 rounded border border-slate-200">{c}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {crudModalState && (
        <UniversalCrudModal
          title={crudModalState.title}
          mode={crudModalState.mode}
          record={crudModalState.record}
          fields={crudModalState.fields}
          todayRef={todayRef}
          onClose={() => setCrudModalState(null)}
          onSave={crudModalState.onSave}
        />
      )}
    </div>
  );
}
