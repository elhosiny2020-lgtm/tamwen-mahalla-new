'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  formatArabicNumber,
  formatDateArabic,
  getRoleArabicLabel,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import AnimatedStatCard, { StatColorTheme } from './AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';

export type GrainSubTabCode = 'GRAIN' | 'SILOS' | 'MILLS' | 'COLD';

const GRAIN_INTERNAL_TABS: {
  code: GrainSubTabCode;
  label: string;
  subtitle: string;
  icon: React.ElementType;
}[] = [
  {
    code: 'GRAIN',
    label: '١. صيانة الحبوب والأقماح',
    subtitle: 'متابعة الأقماح المحلية والمستوردة ومؤشرات التخزين والتوريد',
    icon: Wheat,
  },
  {
    code: 'SILOS',
    label: '٢. الشون والصوامع الهندسية',
    subtitle: 'السعات التخزينية وحركة توريد الأقماح بالصوامع والشون',
    icon: Warehouse,
  },
  {
    code: 'MILLS',
    label: '٣. المطاحن التموينية',
    subtitle: 'متابعة طحن الدقيق التمويني استخراج ٨٧٫٥٪ وحصص التشغيل اليومية',
    icon: Factory,
  },
  {
    code: 'COLD',
    label: '٤. الثلاجات وحفظ الأغذية',
    subtitle: 'رقابة السلع الغذائية المجمدة والمبردة وسلامة التبريد والتخزين',
    icon: ThermometerSnowflake,
  },
];

interface DepartmentWorkspaceProps {
  userId?: string;
  dept: Department;
  currentBranch?: Branch;
  bakeries: BakeryRecord[];
  users: User[];
  branches: Branch[];
  inspections: InspectionRecord[];
  debtTransactions: DebtTransactionRecord[];
  auditLogs: AuditLog[];
  initialGrainSubTab?: GrainSubTabCode;
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
  userId = 'default',
  dept,
  currentBranch,
  bakeries,
  users,
  branches,
  inspections,
  debtTransactions,
  auditLogs,
  initialGrainSubTab = 'GRAIN',
  onOpenBakeries,
}: DepartmentWorkspaceProps) {
  const isGrainDepartment =
    dept.code === 'GRAIN' ||
    dept.code === 'SILOS' ||
    dept.code === 'MILLS' ||
    dept.code === 'COLD';

  const [activeGrainSubTab, setActiveGrainSubTab] = useState<GrainSubTabCode>(
    isGrainDepartment ? initialGrainSubTab : 'GRAIN'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>('metricValue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>(['code']);
  const [toastMsg, setToastMsg] = useState<string>('');

  useEffect(() => {
    if (isGrainDepartment) {
      const frame = requestAnimationFrame(() => {
        setActiveGrainSubTab(initialGrainSubTab);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isGrainDepartment, initialGrainSubTab]);

  const effectiveCode = isGrainDepartment ? activeGrainSubTab : dept.code;
  const activeGrainTabMeta = GRAIN_INTERNAL_TABS.find((t) => t.code === activeGrainSubTab) || GRAIN_INTERNAL_TABS[0];

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const activeBakeries = useMemo(() => bakeries.filter((b) => !b.isArchived), [bakeries]);

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

    switch (effectiveCode) {
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

      case 'GRAIN': {
        metricColLabel = 'رصيد الأقماح والحصص (شيكارة)';
        financialColLabel = 'قيمة الدقيق التأمينية (ج.م)';
        const monthlyTons = Math.round((totalActualQuota * 30 * 50) / 1000);
        cards = [
          { title: 'الرصيد اليومي الموجه للدقيق', value: totalActualQuota, unit: 'شيكارة / يوم', icon: Wheat, theme: 'navy', indicator: 'صيانة الحبوب والأقماح' },
          { title: 'الكمية الشهرية المكافئة', value: monthlyTons, unit: 'طن دقيق شهرياً', icon: Warehouse, theme: 'teal', indicator: 'توريد الأقماح والمطاحن' },
          { title: 'الطاقة الاستيعابية القصوى', value: activeBakeries.reduce((s, b) => s + b.dailyCapacitySacks, 0), unit: 'شيكارة / يوم', icon: Factory, theme: 'green', indicator: 'جاهزية التشغيل' },
          { title: 'إجمالي القيمة التأمينية للدقيق', value: totalInsurance, format: 'currency', icon: Coins, theme: 'gold', indicator: 'تغطية كاملة' },
        ];
        rows = activeBakeries.map((b) => ({
          id: b.id,
          code: `حبوب-${b.bakeryNumber}`,
          title: `متابعة حبوب ودقيق — ${b.name}`,
          location: `${b.village} — ${b.localUnit}`,
          metricValue: b.actualQuota,
          metricUnit: 'شيكارة / يوم',
          financialValue: b.insuranceAmountEgp,
          date: b.startDate,
          status: b.operationStatus,
          notes: `استخراج ٨٧٫٥٪ · خط الإنتاج: ${b.productionLineType}`,
        }));
        break;
      }

      case 'SILOS': {
        metricColLabel = 'السعة التخزينية (طن)';
        financialColLabel = 'قيمة المخزون التأميني (ج.م)';
        const totalSiloCapacityTons = Math.max(12000, Math.round((totalActualQuota * 45 * 50) / 1000) * 10);
        const monthlySuppliedTons = Math.round((totalActualQuota * 30 * 50) / 1000);
        cards = [
          { title: 'السعة التخزينية للصوامع والشون', value: totalSiloCapacityTons, unit: 'طن قمح', icon: Warehouse, theme: 'navy', indicator: 'الصوامع والشون الهندسية' },
          { title: 'الكمية الموردة شهرياً', value: monthlySuppliedTons, unit: 'طن قمح / شهر', icon: TrendingUp, theme: 'green', indicator: 'انتظام التوريد' },
          { title: 'عدد مواقع التخزين والتوزيع', value: Math.max(4, activeBakeries.length), unit: 'موقع ونطاق', icon: Building2, theme: 'teal', indicator: 'تغطية مركز المحلة' },
          { title: 'القيمة التأمينية للمخزون', value: totalInsurance, format: 'currency', icon: Coins, theme: 'gold', indicator: 'مخزون استراتيجي' },
        ];
        rows = activeBakeries.map((b, idx) => ({
          id: `silo-${b.id}`,
          code: `صومعة-${toArabicNumerals(idx + 1).padStart(2, '٠')}`,
          title: `نطاق توريد شونة وصومعة ${b.village}`,
          location: `${b.village} — ${b.localUnit}`,
          metricValue: Math.max(15, Math.round((b.dailyCapacitySacks * 30 * 50) / 1000)),
          metricUnit: 'طن / شهر',
          financialValue: b.insuranceAmountEgp,
          date: b.updatedAt?.slice(0, 10) || b.startDate,
          status: b.activityStatus === 'نشط' ? 'سعة متاحة ومؤمنة' : 'قيد المراجعة الفنية',
          notes: `المخبز المرتبط: ${b.name} · الطاقة: ${toArabicNumerals(b.dailyCapacitySacks)} شيكارة/يوم`,
        }));
        break;
      }

      case 'MILLS': {
        metricColLabel = 'حصة الطحن اليومية (شيكارة)';
        financialColLabel = 'قيمة الدقيق المطحون (ج.م)';
        const totalDailyCapacity = activeBakeries.reduce((s, b) => s + b.dailyCapacitySacks, 0);
        cards = [
          { title: 'إجمالي حصص الطحن اليومية', value: totalActualQuota, unit: 'شيكارة / يوم', icon: Factory, theme: 'navy', indicator: 'استخراج ٨٧٫٥٪' },
          { title: 'الطاقة التشغيلية للمطاحن', value: totalDailyCapacity, unit: 'شيكارة / يوم', icon: CheckCircle2, theme: 'green', indicator: 'جاهزية الطحن' },
          { title: 'الأرغفة المنتجة من الدقيق', value: totalDailyLoaves, unit: 'رغيف / يوم', icon: Wheat, theme: 'teal', indicator: 'مؤشر الإنتاج' },
          { title: 'القيمة التأمينية للدقيق', value: totalInsurance, format: 'currency', icon: Coins, theme: 'gold', indicator: 'تسوية المطاحن' },
        ];
        rows = activeBakeries.map((b) => ({
          id: `mill-${b.id}`,
          code: `مطحن-${b.bakeryNumber}`,
          title: `توريد مطحن — ${b.name}`,
          location: b.village,
          metricValue: b.actualQuota,
          metricUnit: 'شيكارة / يوم',
          financialValue: b.insuranceAmountEgp,
          date: b.startDate,
          status: b.operationStatus,
          notes: `الوقود: ${b.fuelType} · معامل الإنتاج: ${toArabicNumerals(b.productionFactor)} رغيف/شيكارة`,
        }));
        break;
      }

      case 'COLD': {
        metricColLabel = 'سعة التبريد / الحفظ';
        financialColLabel = 'القيمة الرقابية (ج.م)';
        cards = [
          { title: 'الثلاجات ومنافذ التبريد الخاضعة للرقابة', value: activeBakeries.length, unit: 'ثلاجة / منفذ حفظ', icon: ThermometerSnowflake, theme: 'navy', indicator: 'رقابة الأغذية المجمدة' },
          { title: 'العمليات والحملات المطابقة', value: inspections.filter((i) => i.status === 'مطابق').length + activeBakeries.filter((b) => b.activityStatus === 'نشط').length, unit: 'فحص مطابق', icon: CheckCircle2, theme: 'green', indicator: 'سلامة التبريد' },
          { title: 'إجمالي المستفيدين بالمنطقة', value: totalBeneficiaries, unit: 'مواطن', icon: Users, theme: 'teal', indicator: 'تغطية غذائية' },
          { title: 'محاضر ومخالفات الصلاحية والتخزين', value: inspections.filter((i) => i.type !== 'حملة تموينية').length, unit: 'محضر رقابي', icon: AlertTriangle, theme: 'red', indicator: 'متابعة التبريد' },
        ];
        rows = activeBakeries.map((b, idx) => ({
          id: `cold-${b.id}`,
          code: `ثلاجة-${toArabicNumerals(idx + 101)}`,
          title: `ثلاجة وحفظ أغذية نطاق ${b.village}`,
          location: `${b.village} — ${b.localUnit}`,
          metricValue: Math.max(10, Math.round(b.dailyCapacitySacks * 1.5)),
          metricUnit: 'طن تبريد',
          financialValue: b.insuranceAmountEgp,
          date: b.updatedAt?.slice(0, 10) || b.createdAt.slice(0, 10),
          status: b.activityStatus === 'نشط' ? 'درجات التبريد مطابقة' : 'تحت الفحص الفني',
          notes: `التصنيف الرقابي: ${b.bakeryCategory} · مراجعة تواريخ الصلاحية والتخزين المبرد`,
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
          notes: `متوسط الفرد ٢٠٢٥: ${toArabicNumerals(b.avgPerCapita2025.toFixed(2))}`,
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
        const DeptIcon = iconMap[effectiveCode] || Building2;
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
  }, [effectiveCode, activeBakeries, users, branches, inspections, debtTransactions, auditLogs, currentBranch]);

  const filteredRows = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    return config.rows.filter((r) => {
      if (!q) return true;
      return normalizeSearchText(`${r.code} ${r.title} ${r.location} ${r.status} ${r.notes}`).includes(q);
    });
  }, [config.rows, searchTerm]);

  const togglePin = (key: string) =>
    setPinnedCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const tableColumns: SmartTableColumn<WorkspaceRow>[] = useMemo(
    () => [
      {
        key: 'code',
        label: 'الكود / الرقم',
        headerText: 'الكود / الرقم',
        type: 'numeric',
        align: 'center',
        defaultWidth: 118,
        measureValue: (r) => toArabicNumerals(r.code),
        render: (r) => <span className="font-black text-[#164E83]">{toArabicNumerals(r.code)}</span>,
      },
      {
        key: 'title',
        label: 'البيان / المنشأة',
        headerText: 'البيان / المنشأة',
        type: 'name',
        defaultWidth: 195,
        render: (r) => <span className="font-black text-[#102A43]">{r.title}</span>,
      },
      {
        key: 'location',
        label: 'الموقع / جهة العمل',
        headerText: 'الموقع / جهة العمل',
        type: 'longText',
        defaultWidth: 185,
        render: (r) => <span className="text-slate-700">{r.location}</span>,
      },
      {
        key: 'metricValue',
        label: config.metricColLabel,
        headerText: config.metricColLabel,
        type: 'numeric',
        align: 'center',
        defaultWidth: 145,
        measureValue: (r) => `${formatArabicNumber(r.metricValue)} ${r.metricUnit}`,
        render: (r) => (
          <span className="font-black text-[#102A43]">
            {formatArabicNumber(r.metricValue)} {r.metricUnit}
          </span>
        ),
      },
      {
        key: 'financialValue',
        label: config.financialColLabel,
        headerText: config.financialColLabel,
        type: effectiveCode === 'HR' ? 'numeric' : 'currency',
        align: 'center',
        defaultWidth: 150,
        measureValue: (r) =>
          effectiveCode === 'HR'
            ? `${formatArabicNumber(r.financialValue)} قسم`
            : `${formatArabicNumber(r.financialValue)} ج.م`,
        render: (r) => (
          <span className="font-black text-emerald-800">
            {effectiveCode === 'HR'
              ? `${formatArabicNumber(r.financialValue)} قسم`
              : `${formatArabicNumber(r.financialValue)} ج.م`}
          </span>
        ),
      },
      {
        key: 'date',
        label: 'التاريخ',
        headerText: 'التاريخ',
        type: 'date',
        align: 'center',
        defaultWidth: 112,
        measureValue: (r) => formatDateArabic(r.date),
        render: (r) => <span className="text-slate-600">{formatDateArabic(r.date)}</span>,
      },
      {
        key: 'status',
        label: 'الحالة',
        headerText: 'الحالة',
        type: 'badge',
        align: 'center',
        defaultWidth: 130,
        render: (r) => (
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold whitespace-nowrap">
            {r.status}
          </span>
        ),
      },
      {
        key: 'notes',
        label: 'ملاحظات تفصيلية',
        headerText: 'ملاحظات تفصيلية',
        type: 'longText',
        defaultWidth: 235,
        measureValue: (r) => toArabicNumerals(r.notes),
        render: (r) => <span className="text-slate-700">{toArabicNumerals(r.notes)}</span>,
      },
      {
        key: 'actions',
        label: 'الإجراءات',
        headerText: 'الإجراءات',
        type: 'actions',
        align: 'center',
        defaultWidth: 165,
        render: (r) => (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => notify(`معاينة السجل: ${r.title} (${r.code}) — الحالة: ${r.status}`)}
              className="px-2 py-1 rounded bg-[#102A43] hover:bg-[#164E83] text-[#C6A15B] text-[10px] font-black cursor-pointer"
            >
              معاينة
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#102A43] text-[10px] font-black cursor-pointer"
            >
              طباعة
            </button>
          </div>
        ),
      },
    ],
    [config.metricColLabel, config.financialColLabel, effectiveCode]
  );

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div className="bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#C6A15B]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Department Header Banner */}
      <div className="bg-[#102A43] text-white rounded-2xl p-5 border border-[#164E83] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-xs font-black text-[#C6A15B] block mb-0.5">
            {currentBranch?.arabicName || 'إدارة تموين مركز المحلة الكبرى'} · مديرية التموين بالغربية
          </span>
          <h2 className="text-xl font-black text-white">
            {isGrainDepartment ? 'قسم صيانة الحبوب' : dept.arabicName}
          </h2>
          <p className="text-[11px] text-slate-300 font-bold mt-0.5">
            {isGrainDepartment ? activeGrainTabMeta.subtitle : dept.description}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#164E83] hover:bg-[#1e609e] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#C6A15B]" />
            <span>طباعة التقرير</span>
          </button>
          <button
            type="button"
            onClick={onOpenBakeries}
            className="px-4 py-2 bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] rounded-xl text-xs font-black cursor-pointer"
          >
            منظومة الرقابة على المخابز
          </button>
        </div>
      </div>

      {/* التبويبات الداخلية المدمجة داخل قسم صيانة الحبوب (الحبوب + الصوامع + المطاحن + الثلاجات) */}
      {isGrainDepartment && (
        <nav
          aria-label="تبويبات قسم صيانة الحبوب"
          className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-3.5 space-y-2.5 shadow-xs print:hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Wheat className="w-4 h-4 text-[#164E83] shrink-0" />
              <span className="text-xs font-black text-[#102A43]">
                شاشات وتبويبات قسم صيانة الحبوب ({toArabicNumerals(GRAIN_INTERNAL_TABS.length)} أقسام فرعية مدمجة)
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-[#164E83]">
              التبويب النشط: {activeGrainTabMeta.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {GRAIN_INTERNAL_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeGrainSubTab === tab.code;
              return (
                <button
                  key={tab.code}
                  type="button"
                  onClick={() => {
                    setActiveGrainSubTab(tab.code);
                    setSearchTerm('');
                    setSelectedIds([]);
                  }}
                  className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-black flex items-start gap-2.5 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#102A43] text-[#C6A15B] border-[#C6A15B]/70 shadow-sm'
                      : 'bg-slate-50/80 text-[#102A43] border-slate-200 hover:bg-blue-50 hover:border-[#164E83]/40'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#164E83] text-[#C6A15B]' : 'bg-[#102A43]/10 text-[#164E83]'
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block leading-snug break-words whitespace-normal">
                      {tab.label}
                    </span>
                    <span
                      className={`block text-[10px] font-bold mt-0.5 leading-snug break-words whitespace-normal ${
                        isSelected ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {tab.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Animated Colored KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {config.cards.map((card, i) => (
          <AnimatedStatCard
            key={`${effectiveCode}-card-${i}`}
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

      {/* Search Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث فوري بالأرقام العربية أو اللاتينية أو الاسم أو القرية..."
            className="w-full pr-9 pl-3 py-2 bg-[#F4F7FB] border border-slate-300 rounded-lg text-xs font-bold"
          />
        </div>
        <span className="text-xs font-extrabold text-slate-600">
          سجلات حقيقية مربوطة بقاعدة بيانات الإدارة التموينية
        </span>
      </div>

      {/* Unified Smart Auto-Fit Table */}
      <SmartAutoFitTable
        tableId={`dept_${effectiveCode}`}
        userId={userId}
        rows={filteredRows}
        totalCount={config.rows.length}
        getRowId={(r) => r.id}
        columns={tableColumns}
        sortKey={sortKey}
        sortAsc={sortAsc}
        onSort={handleSort}
        selectable
        selectedIds={selectedIds}
        onToggleSelect={(id) =>
          setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
        }
        onClearSelection={() => setSelectedIds([])}
        pinnedKeys={pinnedCols}
        onPinAll={() => setPinnedCols(['code', 'title'])}
        onUnpinAll={() => setPinnedCols([])}
        onTogglePinColumn={togglePin}
        onResetPinDefaults={() => setPinnedCols(['code'])}
        onNotify={notify}
        emptyMessage="لا توجد سجلات مطابقة لمعايير البحث الحالية."
      />
    </div>
  );
}
