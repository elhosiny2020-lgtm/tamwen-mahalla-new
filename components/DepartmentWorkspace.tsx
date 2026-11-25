'use client';

import React, { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Package,
  Wheat,
  Users,
  BarChart3,
  Fuel,
  Warehouse,
  Factory,
  ShieldAlert,
  Calculator,
  Boxes,
  FolderArchive,
  Settings,
  Database,
  ThermometerSnowflake,
  Search,
  Printer,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Coins,
  Building2,
  ClipboardList,
} from 'lucide-react';
import {
  AuditLog,
  BakeryRecord,
  Branch,
  DebtTransactionRecord,
  Department,
  InspectionRecord,
  User,
} from '@/types';
import {
  compareTableValues,
  formatArabicNumber,
  formatDateArabic,
  getRoleArabicLabel,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import AnimatedStatCard, { StatColorTheme } from './AnimatedStatCard';
import SortableTh from './SortableTh';
import TableControlsBar from './TableControlsBar';

interface DepartmentWorkspaceProps {
  dept: Department;
  currentBranch?: Branch;
  bakeries: BakeryRecord[];
  users: User[];
  branches: Branch[];
  inspections: InspectionRecord[];
  debtTransactions: DebtTransactionRecord[];
  auditLogs: AuditLog[];
  onOpenBakeries: () => void;
}

interface WorkspaceRow {
  id: string;
  code: string;
  title: string;
  location: string;
  metricValue: number;
  metricUnit: string;
  financialValue: number;
  date: string;
  status: string;
  notes: string;
}

export default function DepartmentWorkspace({
  dept,
  currentBranch,
  bakeries,
  users,
  branches,
  inspections,
  debtTransactions,
  auditLogs,
  onOpenBakeries,
}: DepartmentWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>('metricValue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>(['code']);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const activeBakeries = useMemo(() => bakeries.filter((b) => !b.isArchived), [bakeries]);

  // Build real, domain-grounded KPI cards & table rows derived directly from system records
  const config = useMemo(() => {
    const totalActualQuota = activeBakeries.reduce((s, b) => s + (b.actualQuota || 0), 0);
    const totalDailyLoaves = activeBakeries.reduce((s, b) => s + (b.dailyLoavesCount || 0), 0);
    const totalBeneficiaries = activeBakeries.reduce((s, b) => s + (b.beneficiaries2025 || 0), 0);
    const totalDebts = activeBakeries.reduce((s, b) => s + (b.remainingDebtEgp || 0), 0);
    const totalInsurance = activeBakeries.reduce((s, b) => s + (b.insuranceAmountEgp || 0), 0);
    const totalFines = inspections.reduce((s, r) => s + (r.fineAmountEgp || 0), 0);
    const validCommercial = activeBakeries.filter((b) => Boolean(b.commercialRegisterNumber)).length;
    const activeUsers = users.filter((u) => u.status === 'active').length;

    let cards: {
      title: string;
      value: number;
      unit?: string;
      format?: 'integer' | 'decimal' | 'currency' | 'percent';
      icon: React.ElementType;
      theme: StatColorTheme;
      indicator: string;
    }[] = [];

    let rows: WorkspaceRow[] = [];
    let metricColLabel = 'الكمية / المؤشر';
    let financialColLabel = 'القيمة المالية (ج.م)';

    switch (dept.code) {
      case 'TRADE': {
        metricColLabel = 'المستفيدون بالمنطقة';
        financialColLabel = 'التأمين التجاري (ج.م)';
        cards = [
          { title: 'السجلات التجارية المفعلة', value: validCommercial, unit: 'سجل تجاري', icon: ShoppingBag, theme: 'navy', indicator: 'مطابق وموثق' },
          { title: 'منافذ الأسواق والمخابز', value: activeBakeries.length, unit: 'منشأة تموينية', icon: Building2, theme: 'teal', indicator: 'نطاق المركز' },
          { title: 'قيمة الضمانات والتأمين', value: totalInsurance, format: 'currency', icon: Coins, theme: 'gold', indicator: 'أرصدة معتمدة' },
          { title: 'مخالفات الأسواق والأسعار', value: inspections.filter((i) => i.type !== 'حملة تموينية').length, unit: 'محضر رقابي', icon: AlertTriangle, theme: 'red', indicator: 'قيد المتابعة' },
        ];
        rows = activeBakeries.map((b) => ({
          id: b.id,
          code: b.commercialRegisterNumber || 'غير مسجل',
          title: b.name,
          location: `${b.village} — ${b.localUnit}`,
          metricValue: b.beneficiaries2025,
          metricUnit: 'مستفيد',
          financialValue: b.insuranceAmountEgp,
          date: b.commercialRegisterExpiryDate || b.startDate,
          status: b.commercialRegisterNumber ? 'سجل تجاري ساري' : 'استكمال بيانات السجل',
          notes: `البطاقة الضريبية: ${b.taxCardNumber || 'غير مسجلة'}`,
        }));
        break;
      }

      case 'COMM': {
        metricColLabel = 'عدد المستفيدين';
        financialColLabel = 'التكلفة التقديرية (ج.م)';
        cards = [
          { title: 'إجمالي المستفيدين بالبطاقات', value: totalBeneficiaries, unit: 'مواطن مستفيد', icon: Package, theme: 'navy', indicator: 'تحديث ٢٠٢٥' },
          { title: 'منافذ الصرف المرتبطة', value: activeBakeries.length, unit: 'منفذ تمويني', icon: CheckCircle2, theme: 'green', indicator: 'انتظام الصرف' },
          { title: 'معدل الصرف اليومي للأرغفة', value: totalDailyLoaves, unit: 'رغيف / يوم', icon: TrendingUp, theme: 'teal', indicator: 'مؤشر تشغيلي' },
          { title: 'المستحقات المالية للصرف', value: totalInsurance, format: 'currency', icon: Coins, theme: 'gold', indicator: 'تسويات مالية' },
        ];
        rows = activeBakeries.map((b) => ({
          id: b.id,
          code: b.posNumber,
          title: `نطاق صرف ${b.village} — ${b.name}`,
          location: b.localUnit,
          metricValue: b.beneficiaries2025,
          metricUnit: 'بطاقة/مستفيد',
          financialValue: b.dailyLoavesCount * 1,
          date: b.updatedAt?.slice(0, 10) || b.createdAt.slice(0, 10),
          status: b.activityStatus === 'نشط' ? 'صرف منتظم' : 'موقوف مؤقتاً',
          notes: `الحصة اليومية: ${toArabicNumerals(b.actualQuota)} شيكارة`,
        }));
        break;
      }

      case 'GRAIN':
      case 'SILOS':
      case 'MILLS': {
        metricColLabel = 'الحصة اليومية (شيكارة)';
        financialColLabel = 'قيمة الدقيق التأمينية (ج.م)';
        const monthlyTons = Math.round((totalActualQuota * 30 * 50) / 1000);
        cards = [
          { title: 'الرصيد اليومي الموجه للدقيق', value: totalActualQuota, unit: 'شيكارة / يوم', icon: Wheat, theme: 'navy', indicator: 'استخراج ٨٧٫٥٪' },
          { title: 'الكمية الشهرية المكافئة', value: monthlyTons, unit: 'طن دقيق شهرياً', icon: Warehouse, theme: 'teal', indicator: 'توريد المطاحن' },
          { title: 'الطاقة الاستيعابية القصوى', value: activeBakeries.reduce((s, b) => s + b.dailyCapacitySacks, 0), unit: 'شيكارة / يوم', icon: Factory, theme: 'green', indicator: 'جاهزية التشغيل' },
          { title: 'إجمالي القيمة التأمينية للدقيق', value: totalInsurance, format: 'currency', icon: Coins, theme: 'gold', indicator: 'تغطية كاملة' },
        ];
        rows = activeBakeries.map((b) => ({
          id: b.id,
          code: `طحن-${b.bakeryNumber}`,
          title: b.name,
          location: b.village,
          metricValue: b.actualQuota,
          metricUnit: 'شيكارة / يوم',
          financialValue: b.insuranceAmountEgp,
          date: b.startDate,
          status: b.operationStatus,
          notes: `الوقود: ${b.fuelType} · الخط: ${b.productionLineType}`,
        }));
        break;
      }

      case 'HR': {
        metricColLabel = 'الفروع المصرح بها';
        financialColLabel = 'الأقسام المفعلة';
        cards = [
          { title: 'إجمالي العاملين بالمنظومة', value: users.length, unit: 'موظف ومفتش', icon: Users, theme: 'navy', indicator: 'كادر معتمد' },
          { title: 'العاملون النشطون حالياً', value: activeUsers, unit: 'حساب نشط', icon: CheckCircle2, theme: 'green', indicator: 'على رأس العمل' },
          { title: 'الإدارات والفروع بالمحافظة', value: branches.length, unit: 'إدارة تموينية', icon: Building2, theme: 'purple', indicator: 'محافظة الغربية' },
          { title: 'عمليات مسجلة بالسجل', value: auditLogs.length, unit: 'حركة موثقة', icon: ClipboardList, theme: 'teal', indicator: 'أداء تشغيلي' },
        ];
        rows = users.map((u) => ({
          id: u.id,
          code: u.employeeNumber || u.id,
          title: u.fullName,
          location: u.workplace,
          metricValue: u.branchIds.length,
          metricUnit: 'فرع',
          financialValue: u.departmentIds.length,
          date: u.createdAt.slice(0, 10),
          status: u.status === 'active' ? 'على رأس العمل' : 'موقوف / إجازة',
          notes: `${u.jobTitle} — ${getRoleArabicLabel(u.role)}`,
        }));
        break;
      }

      case 'REP': {
        metricColLabel = 'الأرغفة اليومية';
        financialColLabel = 'المديونية القائمة (ج.م)';
        cards = [
          { title: 'إجمالي المخابز بالتقارير', value: activeBakeries.length, unit: 'مخبز بلدي', icon: BarChart3, theme: 'navy', indicator: 'بيانات حية' },
          { title: 'إجمالي الإنتاج اليومي', value: totalDailyLoaves, unit: 'رغيف يومياً', icon: CheckCircle2, theme: 'green', indicator: 'معادلات معتمدة' },
          { title: 'إجمالي الغرامات والمديونيات', value: totalDebts + totalFines, format: 'currency', icon: Coins, theme: 'gold', indicator: 'ملخص مالي' },
          { title: 'إجمالي المحاضر والعمليات', value: inspections.length + debtTransactions.length, unit: 'عملية موثقة', icon: ClipboardList, theme: 'purple', indicator: 'تقرير شامل' },
        ];
        rows = activeBakeries.map((b) => ({
          id: b.id,
          code: b.bakeryNumber,
          title: b.name,
          location: b.village,
          metricValue: b.dailyLoavesCount,
          metricUnit: 'رغيف/يوم',
          financialValue: b.remainingDebtEgp,
          date: b.licenseExpiryDate,
          status: b.activityStatus,
          notes: `متوسط الفرد ٢٠٢٥: ${toArabicNumerals(b.avgPerCapita2025.toFixed(3))}`,
        }));
        break;
      }

      default: {
        const iconMap: Record<string, React.ElementType> = {
          GAS: Fuel,
          COLD: ThermometerSnowflake,
          CTRL: ShieldAlert,
          FIN: Calculator,
          STORE: Boxes,
          DOCS: FolderArchive,
          SETT: Settings,
          BACK: Database,
        };
        const DeptIcon = iconMap[dept.code] || Building2;
        metricColLabel = 'الحصة / الطاقة اليومية';
        financialColLabel = 'القيمة المالية (ج.م)';
        cards = [
          { title: 'المنشآت المرتبطة بالفرع', value: activeBakeries.length, unit: 'منشأة مسجلة', icon: DeptIcon, theme: 'navy', indicator: currentBranch?.arabicName || 'محافظة الغربية' },
          { title: 'العمليات المكتملة', value: debtTransactions.filter((t) => t.status === 'مسدد').length + inspections.filter((i) => i.status === 'مطابق').length, unit: 'عملية معتمدة', icon: CheckCircle2, theme: 'green', indicator: 'إنجاز فعلي' },
          { title: 'المؤشرات المالية للقسم', value: totalInsurance + totalDebts, format: 'currency', icon: Coins, theme: 'gold', indicator: 'أرصدة مسجلة' },
          { title: 'السجلات الرقابية والتدقيق', value: auditLogs.length + inspections.length, unit: 'سجل محفوظ', icon: ShieldAlert, theme: 'purple', indicator: 'متابعة مستمرة' },
        ];
        rows = activeBakeries.map((b) => ({
          id: b.id,
          code: b.bakeryNumber,
          title: b.name,
          location: `${b.village} — ${b.localUnit}`,
          metricValue: b.actualQuota,
          metricUnit: 'شيكارة/يوم',
          financialValue: b.insuranceAmountEgp,
          date: b.createdAt.slice(0, 10),
          status: b.activityStatus,
          notes: `نوع الوقود: ${b.fuelType} · التصنيف: ${b.bakeryCategory}`,
        }));
        break;
      }
    }

    return { cards, rows, metricColLabel, financialColLabel };
  }, [dept.code, activeBakeries, users, branches, inspections, debtTransactions, auditLogs, currentBranch]);

  const filteredRows = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    return config.rows
      .filter((r) => {
        if (!q) return true;
        return normalizeSearchText(`${r.code} ${r.title} ${r.location} ${r.status} ${r.notes}`).includes(q);
      })
      .sort((a, b) => compareTableValues(a[sortKey as keyof WorkspaceRow], b[sortKey as keyof WorkspaceRow], sortAsc));
  }, [config.rows, searchTerm, sortKey, sortAsc]);

  const isPinned = (key: string) => pinnedCols.includes(key);
  const togglePin = (key: string) =>
    setPinnedCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="space-y-4">
      {/* Department Header Banner */}
      <div className="bg-[#102A43] text-white rounded-2xl p-5 border border-[#164E83] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold text-[#C6A15B] block mb-0.5">
            {currentBranch?.arabicName || 'إدارة تموين مركز المحلة الكبرى'} · مديرية التموين بالغربية
          </span>
          <h2 className="text-lg font-black text-white">{dept.arabicName}</h2>
          <p className="text-xs text-slate-300 font-bold mt-0.5">{dept.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-[#164E83] hover:bg-[#1e609e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>طباعة التقرير</span>
          </button>
          <button
            type="button"
            onClick={onOpenBakeries}
            className="px-3.5 py-2 bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] rounded-xl text-xs font-black cursor-pointer"
          >
            منظومة الرقابة على المخابز
          </button>
        </div>
      </div>

      {/* Animated Colored KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {config.cards.map((card, i) => (
          <AnimatedStatCard
            key={`${dept.code}-card-${i}`}
            title={card.title}
            value={card.value}
            unit={card.unit}
            format={card.format || 'integer'}
            icon={card.icon}
            theme={card.theme}
            indicator={card.indicator}
            delay={i * 0.05}
          />
        ))}
      </div>

      {/* Table Counters & Pinning Controls */}
      <TableControlsBar
        totalRecords={config.rows.length}
        displayedRecords={filteredRows.length}
        filteredRecords={filteredRows.length}
        selectedRecords={selectedIds.length}
        totalColumns={7}
        visibleColumns={7}
        onClearSelection={() => setSelectedIds([])}
        columns={[
          { key: 'code', label: 'الرقم / الكود', pinned: isPinned('code') },
          { key: 'title', label: 'البيان / المنشأة', pinned: isPinned('title') },
          { key: 'location', label: 'النطاق الجغرافي', pinned: isPinned('location') },
          { key: 'metricValue', label: config.metricColLabel, pinned: isPinned('metricValue') },
        ]}
        onPinAll={() => setPinnedCols(['code', 'title'])}
        onUnpinAll={() => setPinnedCols([])}
        onTogglePinColumn={togglePin}
        onResetPinDefaults={() => setPinnedCols(['code'])}
      />

      {/* Interactive Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث فوري بالأرقام العربية أو اللاتينية أو الاسم أو القرية..."
              className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
            />
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            سجلات حقيقية مربوطة بقاعدة بيانات الإدارة التموينية
          </span>
        </div>

        <div className="overflow-auto max-h-[58vh] compact-table-scroll">
          <table className="w-full text-right">
            <thead className="bg-[#102A43] text-white sticky top-0 z-10">
              <tr>
                <th className="w-9 text-center">تحديد</th>
                <SortableTh
                  label="الكود / الرقم"
                  sortKey="code"
                  activeSortKey={sortKey}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  align="center"
                  className={isPinned('code') ? 'sticky right-0 z-20 bg-[#102A43] pinned-col-edge' : ''}
                />
                <SortableTh label="البيان / المنشأة" sortKey="title" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortableTh label="الموقع / جهة العمل" sortKey="location" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortableTh label={config.metricColLabel} sortKey="metricValue" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <SortableTh label={config.financialColLabel} sortKey="financialValue" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <SortableTh label="التاريخ" sortKey="date" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <SortableTh label="الحالة" sortKey="status" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <th>ملاحظات تفصيلية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    لا توجد سجلات مطابقة لمعايير البحث الحالية.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F7FB]/60'} hover:bg-blue-50/60`}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            prev.includes(row.id) ? prev.filter((x) => x !== row.id) : [...prev, row.id]
                          )
                        }
                        className="w-3.5 h-3.5 accent-[#102A43] cursor-pointer"
                      />
                    </td>
                    <td
                      className={`num-cell text-center font-bold text-[#164E83] ${
                        isPinned('code') ? 'sticky right-0 z-10 bg-white pinned-col-edge' : ''
                      }`}
                    >
                      {toArabicNumerals(row.code)}
                    </td>
                    <td className="font-bold text-[#102A43] max-w-[200px] truncate" title={row.title}>
                      {row.title}
                    </td>
                    <td className="text-slate-700 max-w-[180px] truncate" title={row.location}>
                      {row.location}
                    </td>
                    <td className="num-cell text-center font-bold text-[#102A43]">
                      {formatArabicNumber(row.metricValue)} {row.metricUnit}
                    </td>
                    <td className="num-cell text-center font-bold text-emerald-800">
                      {dept.code === 'HR'
                        ? `${formatArabicNumber(row.financialValue)} قسم`
                        : `${formatArabicNumber(row.financialValue)} ج.م`}
                    </td>
                    <td className="num-cell text-center text-slate-600">{formatDateArabic(row.date)}</td>
                    <td className="text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold">
                        {row.status}
                      </span>
                    </td>
                    <td className="text-slate-600 max-w-[210px] truncate" title={row.notes}>
                      {toArabicNumerals(row.notes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
