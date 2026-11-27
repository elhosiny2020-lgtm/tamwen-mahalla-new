'use client';

import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Table2,
  PlusCircle,
  Search,
  Users,
  MapPin,
  Calculator,
  ShieldCheck,
  Wheat,
  Layers,
  BarChart3,
  TrendingUp,
  FileBadge,
  Building2,
  ReceiptText,
  FileSignature,
  BellRing,
  ClipboardCheck,
  AlertOctagon,
  FileWarning,
  Eye,
  FileBarChart2,
  Wallet,
  Scale,
  Coins,
  CreditCard,
  BookOpenText,
  FileSpreadsheet,
  CalendarClock,
  Printer,
  SlidersHorizontal,
  ShieldAlert,
  Landmark,
  FolderKanban,
  ChevronDown,
  ChevronLeft,
  Flame,
} from 'lucide-react';
import { normalizeSearchText, toArabicNumerals } from '@/lib/utils';

export type BakerySubTab =
  | 'dashboard'
  | 'registry'
  | 'add'
  | 'owners'
  | 'villages'
  | 'quotas'
  | 'averages'
  | 'licenses'
  | 'contracts'
  | 'alerts'
  | 'inspection'
  | 'debts'
  | 'audit'
  | 'reports'
  | 'print'
  | 'columns';

export interface NavItemConfig {
  id: string;
  num: number;
  label: string;
  tab: BakerySubTab;
  focus?: string;
  icon: React.ElementType;
  badgeCount?: number;
}

interface NavGroupConfig {
  id: string;
  title: string;
  groupIcon: React.ElementType;
  items: NavItemConfig[];
}

interface BakeryNavigationGridProps {
  activeSubTab: BakerySubTab;
  activeFocus: string;
  alertsCount: number;
  violationsCount: number;
  debtorsCount: number;
  onSelect: (tab: BakerySubTab, focus: string) => void;
}

export function getBakeryActiveScreenLabel(activeSubTab: BakerySubTab, activeFocus: string): string {
  const focusMap: Record<string, string> = {
    dashboard: '١. لوحة التحكم الرئيسية للمخابز',
    registry: '٢. سجل المخابز الشامل',
    add: '٣. إضافة مخبز جديد',
    'registry-search': '٤. البحث المتقدم عن مخبز',
    owners: '٥. سجل أصحاب المخابز',
    villages: '٦. القرى والوحدات المحلية',
    'quotas-all': '٧. الحصص التموينية',
    'quotas-insurance': '٨. الحصص التأمينية',
    'quotas-actual': '٩. الحصص الفعلية',
    'quotas-loaves': '١٠. الإنتاج والأرغفة اليومية',
    'avg-beneficiaries': '١١. المستفيدون',
    'avg-percapita': '١٢. متوسطات الفرد (٢٠٢٣–٢٠٢٥)',
    'doc-licenses': '١٣. تراخيص المخابز',
    'doc-commercial': '١٤. السجلات التجارية',
    'doc-tax': '١٥. البطاقات الضريبية',
    'doc-contracts': '١٦. العقود والإيجارات',
    'doc-alerts': '١٧. التنبيهات والتجديد الذكي',
    'ins-campaigns': '١٨. الحملات التموينية',
    'ins-violations': '١٩. المخالفات الرقابية',
    'ins-minutes': '٢٠. المحاضر الرسمية',
    'ins-followup': '٢١. متابعة المخابز',
    'ins-reports': '٢٢. التقارير الرقابية',
    'dbt-all': '٢٣. المديونيات القائمة',
    'dbt-fines': '٢٤. الغرامات وحاسبة الوزن (١٧٥/٢٠٢٤)',
    'dbt-dues': '٢٥. مستحقات المخابز',
    'dbt-payments': '٢٦. السداد والمدفوعات',
    'dbt-statement': '٢٧. كشف حساب مخبز',
    'rep-all': '٢٨. التقارير والإحصائيات',
    'rep-periodic': '٢٩. التقارير الدورية',
    'rep-export': '٣٠. الطباعة والتصدير',
    'rep-settings': '٣١. إعدادات القسم والأعمدة',
  };
  if (focusMap[activeFocus]) return focusMap[activeFocus];

  const tabMap: Record<BakerySubTab, string> = {
    dashboard: '١. لوحة التحكم الرئيسية للمخابز',
    registry: '٢. سجل المخابز الشامل',
    add: '٣. إضافة مخبز جديد',
    owners: '٥. سجل أصحاب المخابز',
    villages: '٦. القرى والوحدات المحلية',
    quotas: '٧. الحصص التموينية والإنتاج',
    averages: '١٢. متوسطات الفرد والمستفيدون',
    licenses: '١٣. التراخيص والسجلات والبطاقات الضريبية',
    contracts: '١٦. العقود والإيجارات',
    alerts: '١٧. التنبيهات والتجديد الذكي',
    inspection: '١٨. الرقابة والتفتيش الميداني',
    debts: '٢٣. المديونيات والحسابات المالية',
    audit: 'سجل التعديلات والمراجعة',
    reports: '٢٨. التقارير والإحصائيات',
    print: '٣٠. الطباعة والتصدير',
    columns: '٣١. إعدادات القسم والأعمدة',
  };
  return tabMap[activeSubTab] || '١. لوحة التحكم الرئيسية للمخابز';
}

export default function BakeryNavigationGrid({
  activeSubTab,
  activeFocus,
  alertsCount,
  violationsCount,
  debtorsCount,
  onSelect,
}: BakeryNavigationGridProps) {
  const [screenSearchQuery, setScreenSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    basic: true,
    quotas: true,
    documents: true,
    inspection: true,
    debts: true,
    reports: true,
  });

  const groups: NavGroupConfig[] = useMemo(
    () => [
      {
        id: 'basic',
        title: '١. القيادة والبيانات الأساسية للمخابز',
        groupIcon: Landmark,
        items: [
          { id: 'basic-dashboard', num: 1, label: '١. لوحة التحكم الرئيسية', tab: 'dashboard', focus: 'dashboard', icon: LayoutDashboard },
          { id: 'basic-registry', num: 2, label: '٢. سجل المخابز الشامل', tab: 'registry', focus: 'registry', icon: Table2 },
          { id: 'basic-add', num: 3, label: '٣. إضافة مخبز جديد', tab: 'add', focus: 'add', icon: PlusCircle },
          { id: 'basic-search', num: 4, label: '٤. البحث المتقدم عن مخبز', tab: 'registry', focus: 'registry-search', icon: Search },
          { id: 'basic-owners', num: 5, label: '٥. أصحاب المخابز', tab: 'owners', focus: 'owners', icon: Users },
          { id: 'basic-villages', num: 6, label: '٦. القرى والوحدات المحلية', tab: 'villages', focus: 'villages', icon: MapPin },
        ],
      },
      {
        id: 'quotas',
        title: '٢. الحصص والإنتاج والمستفيدون',
        groupIcon: Wheat,
        items: [
          { id: 'q-all', num: 7, label: '٧. الحصص التموينية', tab: 'quotas', focus: 'quotas-all', icon: Wheat },
          { id: 'q-ins', num: 8, label: '٨. الحصص التأمينية', tab: 'quotas', focus: 'quotas-insurance', icon: ShieldCheck },
          { id: 'q-act', num: 9, label: '٩. الحصص الفعلية', tab: 'quotas', focus: 'quotas-actual', icon: Layers },
          { id: 'q-loaves', num: 10, label: '١٠. الإنتاج والأرغفة اليومية', tab: 'quotas', focus: 'quotas-loaves', icon: Calculator },
          { id: 'q-benef', num: 11, label: '١١. المستفيدون', tab: 'averages', focus: 'avg-beneficiaries', icon: BarChart3 },
          { id: 'q-avg', num: 12, label: '١٢. متوسطات الفرد (٢٠٢٣–٢٠٢٥)', tab: 'averages', focus: 'avg-percapita', icon: TrendingUp },
        ],
      },
      {
        id: 'documents',
        title: '٣. التراخيص والعقود والمستندات',
        groupIcon: FileBadge,
        items: [
          { id: 'doc-lic', num: 13, label: '١٣. تراخيص المخابز', tab: 'licenses', focus: 'doc-licenses', icon: FileBadge },
          { id: 'doc-comm', num: 14, label: '١٤. السجلات التجارية', tab: 'licenses', focus: 'doc-commercial', icon: Building2 },
          { id: 'doc-tax', num: 15, label: '١٥. البطاقات الضريبية', tab: 'licenses', focus: 'doc-tax', icon: ReceiptText },
          { id: 'doc-cont', num: 16, label: '١٦. العقود والإيجارات', tab: 'contracts', focus: 'doc-contracts', icon: FileSignature },
          { id: 'doc-alerts', num: 17, label: '١٧. التنبيهات والتجديد الذكي', tab: 'alerts', focus: 'doc-alerts', icon: BellRing, badgeCount: alertsCount },
        ],
      },
      {
        id: 'inspection',
        title: '٤. الرقابة والتفتيش الميداني',
        groupIcon: ShieldAlert,
        items: [
          { id: 'ins-campaigns', num: 18, label: '١٨. الحملات التموينية', tab: 'inspection', focus: 'ins-campaigns', icon: ClipboardCheck },
          { id: 'ins-violations', num: 19, label: '١٩. المخالفات الرقابية', tab: 'inspection', focus: 'ins-violations', icon: AlertOctagon, badgeCount: violationsCount },
          { id: 'ins-minutes', num: 20, label: '٢٠. المحاضر الرسمية', tab: 'inspection', focus: 'ins-minutes', icon: FileWarning },
          { id: 'ins-followup', num: 21, label: '٢١. متابعة المخابز', tab: 'inspection', focus: 'ins-followup', icon: Eye },
          { id: 'ins-reports', num: 22, label: '٢٢. التقارير الرقابية', tab: 'inspection', focus: 'ins-reports', icon: FileBarChart2 },
        ],
      },
      {
        id: 'debts',
        title: '٥. المديونيات والحسابات المالية',
        groupIcon: Wallet,
        items: [
          { id: 'dbt-all', num: 23, label: '٢٣. المديونيات القائمة', tab: 'debts', focus: 'dbt-all', icon: Wallet, badgeCount: debtorsCount },
          { id: 'dbt-fines', num: 24, label: '٢٤. الغرامات وحاسبة الوزن (١٧٥/٢٠٢٤)', tab: 'debts', focus: 'dbt-fines', icon: Scale },
          { id: 'dbt-dues', num: 25, label: '٢٥. مستحقات المخابز', tab: 'debts', focus: 'dbt-dues', icon: Coins },
          { id: 'dbt-payments', num: 26, label: '٢٦. السداد والمدفوعات', tab: 'debts', focus: 'dbt-payments', icon: CreditCard },
          { id: 'dbt-statement', num: 27, label: '٢٧. كشف حساب مخبز', tab: 'debts', focus: 'dbt-statement', icon: BookOpenText },
        ],
      },
      {
        id: 'reports',
        title: '٦. التقارير والإحصائيات والإدارة',
        groupIcon: FolderKanban,
        items: [
          { id: 'rep-all', num: 28, label: '٢٨. التقارير والإحصائيات', tab: 'reports', focus: 'rep-all', icon: FileSpreadsheet },
          { id: 'rep-periodic', num: 29, label: '٢٩. التقارير الدورية', tab: 'reports', focus: 'rep-periodic', icon: CalendarClock },
          { id: 'rep-export', num: 30, label: '٣٠. الطباعة والتصدير', tab: 'print', focus: 'rep-export', icon: Printer },
          { id: 'rep-settings', num: 31, label: '٣١. إعدادات القسم والأعمدة', tab: 'columns', focus: 'rep-settings', icon: SlidersHorizontal },
        ],
      },
    ],
    [alertsCount, violationsCount, debtorsCount]
  );

  const totalScreensCount = useMemo(
    () => groups.reduce((acc, g) => acc + g.items.length, 0),
    [groups]
  );

  const filteredGroups = useMemo(() => {
    const q = normalizeSearchText(screenSearchQuery);
    if (!q) return groups;
    return groups
      .map((grp) => ({
        ...grp,
        items: grp.items.filter((item) =>
          normalizeSearchText(`${grp.title} ${item.label}`).includes(q)
        ),
      }))
      .filter((grp) => grp.items.length > 0);
  }, [groups, screenSearchQuery]);

  return (
    <nav
      aria-label="خريطة شاشات منظومة إدارة المخابز"
      className="bg-white rounded-2xl border-2 border-[#102A43]/15 p-3.5 space-y-3 shadow-xs print:hidden overflow-visible"
    >
      {/* شريط العنوان والبحث السريع بنفس نمط قسم التجارة الداخلية */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#164E83] shrink-0" />
          <span className="text-xs sm:text-[13px] font-black text-[#102A43]">
            خريطة شاشات منظومة إدارة المخابز ({toArabicNumerals(totalScreensCount)} شاشة ووظيفة مترابطة)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2" />
            <input
              type="text"
              value={screenSearchQuery}
              onChange={(e) => setScreenSearchQuery(e.target.value)}
              placeholder={`بحث سريع في شاشات المخابز (${toArabicNumerals(totalScreensCount)})...`}
              className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-[#102A43] focus:outline-none focus:border-[#164E83]"
            />
          </div>
          <button
            type="button"
            onClick={() => onSelect('dashboard', 'dashboard')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeSubTab === 'dashboard'
                ? 'bg-[#102A43] text-[#C6A15B] border-[#C6A15B]/60 shadow-xs'
                : 'bg-slate-50 hover:bg-blue-50 text-[#102A43] border-slate-300'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>لوحة التحكم</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('add', 'add')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeSubTab === 'add'
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>إضافة مخبز</span>
          </button>
        </div>
      </div>

      {/* بطاقات المجموعات القابلة للطي بأسلوب قسم التجارة الداخلية بدون قص للنصوص */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredGroups.map((group) => {
          const GroupIcon = group.groupIcon;
          const isOpen = openGroups[group.id] ?? true;
          return (
            <div
              key={group.id}
              className="border border-slate-200 rounded-xl overflow-hidden bg-[#FAFBFD] flex flex-col"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((prev) => ({ ...prev, [group.id]: !isOpen }))
                }
                className="w-full px-3 py-2 bg-[#102A43] text-white hover:bg-[#164E83] flex items-center justify-between gap-2 text-[11px] font-black cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-1.5 min-w-0 text-right">
                  <GroupIcon className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                  <span className="break-words whitespace-normal leading-snug">{group.title}</span>
                </span>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="p-1.5 space-y-1 bg-white flex-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isSelected =
                      activeFocus === item.focus ||
                      (activeSubTab === item.tab &&
                        !groups.some((g) =>
                          g.items.some((i) => i.focus === activeFocus && i.tab === activeSubTab)
                        ) &&
                        group.items[0].id === item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item.tab, item.focus || item.tab)}
                        className={`w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] font-black flex items-center justify-between gap-2 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#102A43] text-[#C6A15B] border-[#C6A15B]/60 shadow-xs'
                            : 'bg-slate-50/70 text-[#102A43] border-slate-200/80 hover:bg-blue-50 hover:border-[#164E83]/40'
                        }`}
                      >
                        <span className="flex items-start gap-2 min-w-0 flex-1">
                          <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="leading-snug break-words whitespace-normal">
                            {item.label}
                          </span>
                        </span>
                        {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                          <span
                            className={`num-cell px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                              isSelected ? 'bg-[#C6A15B] text-[#102A43]' : 'bg-red-700 text-white'
                            }`}
                          >
                            {toArabicNumerals(item.badgeCount)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
