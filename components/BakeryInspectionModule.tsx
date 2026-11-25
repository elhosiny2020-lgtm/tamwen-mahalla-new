'use client';

import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  AlertOctagon,
  FileWarning,
  Eye,
  FileBarChart2,
  PlusCircle,
  Search,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { BakeryRecord, InspectionRecord, User } from '@/types';
import {
  compareTableValues,
  formatArabicNumber,
  formatDateArabic,
  normalizeSearchText,
  toArabicNumerals,
} from '@/lib/utils';
import SortableTh from './SortableTh';
import AnimatedStatCard from './AnimatedStatCard';
import TableControlsBar from './TableControlsBar';

interface BakeryInspectionModuleProps {
  bakeries: BakeryRecord[];
  inspections: InspectionRecord[];
  currentUser: User;
  activeFocus: string;
  todayRef: string;
  onAddInspection: (record: Omit<InspectionRecord, 'id'>) => void;
  onUpdateStatus: (id: string, status: InspectionRecord['status']) => void;
  onSelectBakeryDetails: (bakery: BakeryRecord) => void;
}

export default function BakeryInspectionModule({
  bakeries,
  inspections,
  currentUser,
  activeFocus,
  todayRef,
  onAddInspection,
  onUpdateStatus,
  onSelectBakeryDetails,
}: BakeryInspectionModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>(['recordNumber']);

  const [newBakeryId, setNewBakeryId] = useState<string>(bakeries[0]?.id || '');
  const [newType, setNewType] = useState<InspectionRecord['type']>('مخالفة');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newFine, setNewFine] = useState<number>(0);
  const [newStatus, setNewStatus] = useState<InspectionRecord['status']>('قيد التحقيق');
  const [newNotes, setNewNotes] = useState<string>('');

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const focusMeta: Record<string, { title: string; subtitle: string; typeFilter?: InspectionRecord['type'] }> = {
    'ins-campaigns': {
      title: 'الحملات التموينية المفاجئة والمخططة',
      subtitle: 'سجل الحملات الرقابية الميدانية على مخابز المركز ونتائج التفتيش',
      typeFilter: 'حملة تموينية',
    },
    'ins-violations': {
      title: 'سجل المخالفات التموينية للمخابز',
      subtitle: 'رصد مخالفات الأوزان والمواصفات والتصرف في الدقيق والغرامات المقررة',
      typeFilter: 'مخالفة',
    },
    'ins-minutes': {
      title: 'المحاضر التموينية الرسمية المحررة',
      subtitle: 'متابعة المحاضر المقيدة والمحالة للجهات المختصة والنيابة',
      typeFilter: 'محضر رسمي',
    },
    'ins-followup': {
      title: 'متابعة المخابز الدورية وحالات التوقف',
      subtitle: 'تقارير المرور اليومي والتأكد من انتظام الإنتاج ومواعيد التشغيل',
      typeFilter: 'متابعة دورية',
    },
    'ins-reports': {
      title: 'التقارير الرقابية الشاملة والملخص الإحصائي',
      subtitle: 'إجمالي الحملات والمخالفات والمحاضر والغرامات المحررة على مستوى الإدارة',
    },
  };

  const currentMeta = focusMeta[activeFocus] || focusMeta['ins-reports'];

  const filteredRecords = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    return inspections
      .filter((rec) => {
        if (currentMeta.typeFilter && rec.type !== currentMeta.typeFilter) return false;
        if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
        if (q) {
          const text = normalizeSearchText(
            `${rec.recordNumber} ${rec.bakeryName} ${rec.village} ${rec.inspectorName} ${rec.violationTitle} ${rec.notes}`
          );
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => compareTableValues(a[sortKey as keyof InspectionRecord], b[sortKey as keyof InspectionRecord], sortAsc));
  }, [inspections, currentMeta.typeFilter, statusFilter, searchTerm, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const total = inspections.length;
    const violations = inspections.filter((r) => r.type === 'مخالفة' || r.type === 'محضر رسمي').length;
    const campaigns = inspections.filter((r) => r.type === 'حملة تموينية').length;
    const totalFines = inspections.reduce((sum, r) => sum + (r.fineAmountEgp || 0), 0);
    return { total, violations, campaigns, totalFines };
  }, [inspections]);

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBakery = bakeries.find((b) => b.id === newBakeryId) || bakeries[0];
    if (!targetBakery || !newTitle.trim()) return;

    const prefix =
      newType === 'حملة تموينية'
        ? 'حملة'
        : newType === 'متابعة دورية'
        ? 'متابعة'
        : 'محضر';

    onAddInspection({
      recordNumber: `${prefix}-${todayRef.slice(0, 4)}-${Math.floor(200 + inspections.length * 13)}`,
      bakeryId: targetBakery.id,
      bakeryName: targetBakery.name,
      village: targetBakery.village,
      type: newType,
      date: todayRef,
      inspectorName: currentUser.fullName,
      violationTitle: newTitle.trim(),
      fineAmountEgp: Number(newFine) || 0,
      status: newStatus,
      notes: newNotes.trim() || 'تم القيد إلكترونياً بمنظومة الرقابة على المخابز',
    });

    setNewTitle('');
    setNewFine(0);
    setNewNotes('');
    setShowAddForm(false);
  };

  const isPinned = (key: string) => pinnedCols.includes(key);
  const togglePin = (key: string) =>
    setPinnedCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="space-y-4">
      {/* Animated Colored KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatedStatCard
          title="إجمالي السجلات الرقابية"
          value={stats.total}
          unit="سجل موثق"
          icon={ClipboardCheck}
          theme="navy"
          compact
          delay={0}
        />
        <AnimatedStatCard
          title="الحملات التموينية"
          value={stats.campaigns}
          unit="حملة ميدانية"
          icon={Eye}
          theme="teal"
          compact
          delay={0.05}
        />
        <AnimatedStatCard
          title="المخالفات والمحاضر"
          value={stats.violations}
          unit="محضر ومخالفة"
          icon={AlertOctagon}
          theme="red"
          compact
          delay={0.1}
        />
        <AnimatedStatCard
          title="إجمالي الغرامات المرصودة"
          value={stats.totalFines}
          format="currency"
          indicator="مستحقات رقابية"
          icon={FileWarning}
          theme="gold"
          compact
          delay={0.15}
        />
      </div>

      {/* Table Counters & Pinning Controls */}
      <TableControlsBar
        totalRecords={inspections.length}
        displayedRecords={filteredRecords.length}
        filteredRecords={filteredRecords.length}
        selectedRecords={selectedIds.length}
        totalColumns={10}
        visibleColumns={10}
        onClearSelection={() => setSelectedIds([])}
        columns={[
          { key: 'recordNumber', label: 'رقم السجل', pinned: isPinned('recordNumber') },
          { key: 'date', label: 'التاريخ', pinned: isPinned('date') },
          { key: 'bakeryName', label: 'المخبز', pinned: isPinned('bakeryName') },
          { key: 'village', label: 'القرية', pinned: isPinned('village') },
          { key: 'fineAmountEgp', label: 'الغرامة', pinned: isPinned('fineAmountEgp') },
        ]}
        onPinAll={() => setPinnedCols(['recordNumber', 'bakeryName'])}
        onUnpinAll={() => setPinnedCols([])}
        onTogglePinColumn={togglePin}
        onResetPinDefaults={() => setPinnedCols(['recordNumber'])}
      />

      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-[#102A43] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-black flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-[#C6A15B]" />
              <span>{currentMeta.title}</span>
            </h2>
            <p className="text-[11px] text-slate-300 mt-0.5">{currentMeta.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>تسجيل حملة / مخالفة / محضر</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-[#164E83] hover:bg-[#1e609e] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span>طباعة التقرير الرقابي</span>
            </button>
          </div>
        </div>

        {/* Add New Inspection Form */}
        {showAddForm && (
          <form onSubmit={handleSubmitNew} className="p-4 bg-[#F4F7FB] border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-[#102A43] mb-1">المخبز المعني *</label>
              <select
                value={newBakeryId}
                onChange={(e) => setNewBakeryId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
              >
                {bakeries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.village} ({toArabicNumerals(b.bakeryNumber)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#102A43] mb-1">تصنيف الإجراء الرقابي *</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as InspectionRecord['type'])}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
              >
                <option value="حملة تموينية">حملة تموينية</option>
                <option value="مخالفة">مخالفة</option>
                <option value="محضر رسمي">محضر رسمي</option>
                <option value="متابعة دورية">متابعة دورية</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#102A43] mb-1">قيمة الغرامة المقدرة (ج.م)</label>
              <input
                type="number"
                min={0}
                value={newFine}
                onChange={(e) => setNewFine(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-[#102A43] mb-1">وصف المخالفة أو نتيجة المرور *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="مثال: نقص وزن الرغيف / عدم نظافة أدوات العجين / مطابقة تامة..."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-[#102A43] mb-1">حالة الإجراء</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as InspectionRecord['status'])}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
              >
                <option value="قيد التحقيق">قيد التحقيق</option>
                <option value="محال للنيابة">محال للنيابة</option>
                <option value="تم التسوية">تم التسوية</option>
                <option value="مطابق">مطابق</option>
                <option value="مغلق">مغلق</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3 pt-1">
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="ملاحظات المفتش الميداني (اختياري)..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer shrink-0"
              >
                حفظ وتوثيق السجل
              </button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم المحضر، اسم المخبز، القرية، المفتش أو وصف المخالفة..."
              className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-[#102A43]"
            >
              <option value="all">جميع الحالات</option>
              <option value="قيد التحقيق">قيد التحقيق</option>
              <option value="محال للنيابة">محال للنيابة</option>
              <option value="تم التسوية">تم التسوية</option>
              <option value="مطابق">مطابق</option>
              <option value="مغلق">مغلق</option>
            </select>
          </div>
        </div>

        {/* Sortable Compact Table */}
        <div className="overflow-auto max-h-[60vh] compact-table-scroll">
          <table className="w-full text-right">
            <thead className="bg-slate-100 text-[#102A43] border-b border-slate-300 sticky top-0 z-10">
              <tr>
                <th className="w-9 text-center">تحديد</th>
                <SortableTh
                  label="رقم السجل"
                  sortKey="recordNumber"
                  activeSortKey={sortKey}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  className={isPinned('recordNumber') ? 'sticky right-0 z-20 bg-slate-100 pinned-col-edge' : ''}
                />
                <SortableTh label="التاريخ" sortKey="date" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <SortableTh label="المخبز" sortKey="bakeryName" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortableTh label="القرية" sortKey="village" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortableTh label="النوع" sortKey="type" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <SortableTh label="بيان التفتيش / المخالفة" sortKey="violationTitle" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortableTh label="المفتش المسؤول" sortKey="inspectorName" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortableTh label="الغرامة (ج.م)" sortKey="fineAmountEgp" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <SortableTh label="الحالة" sortKey="status" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                <th className="text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    لا توجد سجلات رقابية مطابقة في هذا القسم حالياً.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const bakery = bakeries.find((b) => b.id === rec.bakeryId);
                  return (
                    <tr key={rec.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F7FB]/60'} hover:bg-blue-50/60`}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rec.id)}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(rec.id) ? prev.filter((x) => x !== rec.id) : [...prev, rec.id]
                            )
                          }
                          className="w-3.5 h-3.5 accent-[#102A43] cursor-pointer"
                        />
                      </td>
                      <td
                        className={`num-cell font-bold text-[#164E83] ${
                          isPinned('recordNumber') ? 'sticky right-0 z-10 bg-white pinned-col-edge' : ''
                        }`}
                      >
                        {toArabicNumerals(rec.recordNumber)}
                      </td>
                      <td className="num-cell text-center text-slate-700">{formatDateArabic(rec.date)}</td>
                      <td className="font-bold text-[#102A43] max-w-[140px] truncate" title={rec.bakeryName}>
                        {bakery ? (
                          <button
                            type="button"
                            onClick={() => onSelectBakeryDetails(bakery)}
                            className="hover:underline text-right cursor-pointer"
                          >
                            {rec.bakeryName}
                          </button>
                        ) : (
                          rec.bakeryName
                        )}
                      </td>
                      <td className="text-slate-700 whitespace-nowrap">{rec.village}</td>
                      <td className="text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                            rec.type === 'مخالفة' || rec.type === 'محضر رسمي'
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-blue-50 text-blue-900 border-blue-200'
                          }`}
                        >
                          {rec.type}
                        </span>
                      </td>
                      <td className="max-w-[230px] truncate text-slate-800" title={`${rec.violationTitle} — ${rec.notes}`}>
                        {toArabicNumerals(rec.violationTitle)}
                      </td>
                      <td className="text-slate-700 whitespace-nowrap">{rec.inspectorName}</td>
                      <td className="num-cell text-center font-bold text-red-800">
                        {rec.fineAmountEgp > 0 ? `${formatArabicNumber(rec.fineAmountEgp)} ج.م` : '—'}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                            rec.status === 'مطابق' || rec.status === 'تم التسوية' || rec.status === 'مغلق'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : rec.status === 'محال للنيابة'
                              ? 'bg-red-700 text-white border-red-800'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="text-center whitespace-nowrap">
                        {rec.status !== 'تم التسوية' && rec.status !== 'مطابق' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(rec.id, 'تم التسوية')}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="تحديث الحالة إلى تم التسوية"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>تسوية</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
