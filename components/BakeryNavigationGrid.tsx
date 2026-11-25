'use client';

import React from 'react';
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
} from 'lucide-react';
import { toArabicNumerals } from '@/lib/utils';

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
  headerBg: string;
  borderAccent: string;
  activeBg: string;
  iconAccent: string;
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

export default function BakeryNavigationGrid({
  activeSubTab,
  activeFocus,
  alertsCount,
  violationsCount,
  debtorsCount,
  onSelect,
}: BakeryNavigationGridProps) {
  const groups: NavGroupConfig[] = [
    {
      id: 'basic',
      title: '١. إدارة المخابز والبيانات الأساسية',
      groupIcon: Landmark,
      headerBg: 'bg-[#102A43] text-white',
      borderAccent: 'border-[#102A43]/25',
      activeBg: 'bg-[#102A43] text-white',
      iconAccent: 'text-[#102A43]',
      items: [
        { id: 'basic-dashboard', label: 'لوحة التحكم', tab: 'dashboard', focus: 'dashboard', icon: LayoutDashboard },
        { id: 'basic-registry', label: 'سجل المخابز', tab: 'registry', focus: 'registry', icon: Table2 },
        { id: 'basic-add', label: 'إضافة مخبز', tab: 'add', focus: 'add', icon: PlusCircle },
        { id: 'basic-search', label: 'البحث عن مخبز', tab: 'registry', focus: 'registry-search', icon: Search },
        { id: 'basic-owners', label: 'أصحاب المخابز', tab: 'owners', focus: 'owners', icon: Users },
        { id: 'basic-villages', label: 'القرى والوحدات', tab: 'villages', focus: 'villages', icon: MapPin },
      ],
    },
    {
      id: 'quotas',
      title: '٢. الحصص والإنتاج والمستفيدون',
      groupIcon: Wheat,
      headerBg: 'bg-[#164E83] text-white',
      borderAccent: 'border-[#164E83]/25',
      activeBg: 'bg-[#164E83] text-white',
      iconAccent: 'text-[#164E83]',
      items: [
        { id: 'q-all', label: 'الحصص التموينية', tab: 'quotas', focus: 'quotas-all', icon: Wheat },
        { id: 'q-ins', label: 'الحصص التأمينية', tab: 'quotas', focus: 'quotas-insurance', icon: ShieldCheck },
        { id: 'q-act', label: 'الحصص الفعلية', tab: 'quotas', focus: 'quotas-actual', icon: Layers },
        { id: 'q-loaves', label: 'الإنتاج والأرغفة', tab: 'quotas', focus: 'quotas-loaves', icon: Calculator },
        { id: 'q-benef', label: 'المستفيدون', tab: 'averages', focus: 'avg-beneficiaries', icon: BarChart3 },
        { id: 'q-avg', label: 'متوسطات الفرد', tab: 'averages', focus: 'avg-percapita', icon: TrendingUp },
      ],
    },
    {
      id: 'documents',
      title: '٣. التراخيص والعقود والمستندات',
      groupIcon: FileBadge,
      headerBg: 'bg-emerald-900 text-white',
      borderAccent: 'border-emerald-900/25',
      activeBg: 'bg-emerald-900 text-white',
      iconAccent: 'text-emerald-800',
      items: [
        { id: 'doc-lic', label: 'التراخيص', tab: 'licenses', focus: 'doc-licenses', icon: FileBadge },
        { id: 'doc-comm', label: 'السجلات التجارية', tab: 'licenses', focus: 'doc-commercial', icon: Building2 },
        { id: 'doc-tax', label: 'البطاقات الضريبية', tab: 'licenses', focus: 'doc-tax', icon: ReceiptText },
        { id: 'doc-cont', label: 'العقود والإيجارات', tab: 'contracts', focus: 'doc-contracts', icon: FileSignature },
        { id: 'doc-alerts', label: 'التنبيهات والتجديد', tab: 'alerts', focus: 'doc-alerts', icon: BellRing, badgeCount: alertsCount },
      ],
    },
    {
      id: 'inspection',
      title: '٤. الرقابة والتفتيش الميداني',
      groupIcon: ShieldAlert,
      headerBg: 'bg-amber-900 text-white',
      borderAccent: 'border-amber-900/25',
      activeBg: 'bg-amber-900 text-white',
      iconAccent: 'text-amber-800',
      items: [
        { id: 'ins-campaigns', label: 'الحملات التموينية', tab: 'inspection', focus: 'ins-campaigns', icon: ClipboardCheck },
        { id: 'ins-violations', label: 'المخالفات', tab: 'inspection', focus: 'ins-violations', icon: AlertOctagon, badgeCount: violationsCount },
        { id: 'ins-minutes', label: 'المحاضر الرسمية', tab: 'inspection', focus: 'ins-minutes', icon: FileWarning },
        { id: 'ins-followup', label: 'متابعة المخابز', tab: 'inspection', focus: 'ins-followup', icon: Eye },
        { id: 'ins-reports', label: 'التقارير الرقابية', tab: 'inspection', focus: 'ins-reports', icon: FileBarChart2 },
      ],
    },
    {
      id: 'debts',
      title: '٥. المديونيات والحسابات المالية',
      groupIcon: Wallet,
      headerBg: 'bg-red-900 text-white',
      borderAccent: 'border-red-900/25',
      activeBg: 'bg-red-900 text-white',
      iconAccent: 'text-red-800',
      items: [
        { id: 'dbt-all', label: 'المديونيات', tab: 'debts', focus: 'dbt-all', icon: Wallet, badgeCount: debtorsCount },
        { id: 'dbt-fines', label: 'الغرامات', tab: 'debts', focus: 'dbt-fines', icon: Scale },
        { id: 'dbt-dues', label: 'مستحقات المخابز', tab: 'debts', focus: 'dbt-dues', icon: Coins },
        { id: 'dbt-payments', label: 'السداد والمدفوعات', tab: 'debts', focus: 'dbt-payments', icon: CreditCard },
        { id: 'dbt-statement', label: 'كشف حساب مخبز', tab: 'debts', focus: 'dbt-statement', icon: BookOpenText },
      ],
    },
    {
      id: 'reports',
      title: '٦. التقارير والإحصائيات والإدارة',
      groupIcon: FolderKanban,
      headerBg: 'bg-indigo-950 text-white',
      borderAccent: 'border-indigo-900/25',
      activeBg: 'bg-indigo-950 text-white',
      iconAccent: 'text-indigo-800',
      items: [
        { id: 'rep-all', label: 'التقارير والإحصائيات', tab: 'reports', focus: 'rep-all', icon: FileSpreadsheet },
        { id: 'rep-periodic', label: 'التقارير الدورية', tab: 'reports', focus: 'rep-periodic', icon: CalendarClock },
        { id: 'rep-export', label: 'الطباعة والتصدير', tab: 'print', focus: 'rep-export', icon: Printer },
        { id: 'rep-settings', label: 'إعدادات القسم', tab: 'columns', focus: 'rep-settings', icon: SlidersHorizontal },
      ],
    },
  ];

  return (
    <nav
      aria-label="أقسام منظومة الرقابة على المخابز"
      className="bg-white rounded-2xl p-2.5 shadow-xs border border-slate-200 space-y-2 print:hidden overflow-visible"
    >
      {/* Top Quick Primary Access Strip (Dashboard / Add Bakery / Registry / Search) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#102A43]">الوصول السريع لوظائف منظومة الرقابة على المخابز</span>
          <span className="text-[11px] font-bold text-slate-500">({toArabicNumerals(6)} مجموعات رئيسية — عرض كامل بدون تمرير)</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelect('dashboard', 'dashboard')}
            className={`px-3 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeSubTab === 'dashboard'
                ? 'bg-[#C6A15B] text-[#102A43] border-[#C6A15B] shadow-xs'
                : 'bg-[#102A43] hover:bg-[#164E83] text-white border-[#102A43]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>لوحة التحكم</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('add', 'add')}
            className={`px-3 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeSubTab === 'add'
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>إضافة مخبز</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('registry', 'registry')}
            className={`px-3 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeSubTab === 'registry' && activeFocus !== 'registry-search'
                ? 'bg-[#164E83] text-white border-[#164E83] shadow-xs'
                : 'bg-[#F4F7FB] hover:bg-slate-200 text-[#102A43] border-slate-300'
            }`}
          >
            <Table2 className="w-3.5 h-3.5 text-[#164E83]" />
            <span>سجل المخابز</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('registry', 'registry-search')}
            className={`px-3 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeFocus === 'registry-search'
                ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>البحث عن مخبز</span>
          </button>
        </div>
      </div>

      {/* Zero-Scroll Responsive 6-Group CSS Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {groups.map((group) => {
          const GroupIcon = group.groupIcon;
          return (
            <div
              key={group.id}
              className={`rounded-xl border ${group.borderAccent} bg-[#FAFBFD] overflow-hidden flex flex-col`}
            >
              <div className={`px-2.5 py-1 text-[11px] font-black flex items-center justify-between ${group.headerBg}`}>
                <span className="flex items-center gap-1.5 truncate">
                  <GroupIcon className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                  <span className="truncate">{group.title}</span>
                </span>
                <span className="text-[10px] opacity-85 shrink-0">{toArabicNumerals(group.items.length)} وظائف</span>
              </div>
              <div className="p-1.5 grid grid-cols-2 sm:grid-cols-3 gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isSelected =
                    activeFocus === item.focus ||
                    (activeSubTab === item.tab &&
                      !groups.some((g) => g.items.some((i) => i.focus === activeFocus && i.tab === activeSubTab)) &&
                      group.items[0].id === item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.tab, item.focus || item.tab)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between gap-1 text-right cursor-pointer border ${
                        isSelected
                          ? `${group.activeBg} border-transparent shadow-xs`
                          : 'bg-white text-[#102A43] border-slate-200/90 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-1 min-w-0">
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-[#C6A15B]' : group.iconAccent
                          }`}
                        />
                        <span className="truncate leading-tight">{item.label}</span>
                      </span>
                      {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                        <span
                          className={`px-1 py-0.2 rounded text-[10px] font-black tabular-nums shrink-0 ${
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
            </div>
          );
        })}
      </div>
    </nav>
  );
}
