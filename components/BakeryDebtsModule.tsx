'use client';

import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Scale,
  Coins,
  CreditCard,
  BookOpenText,
  PlusCircle,
  Search,
  Printer,
} from 'lucide-react';
import { BakeryRecord, DebtTransactionRecord } from '@/types';
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

interface BakeryDebtsModuleProps {
  bakeries: BakeryRecord[];
  transactions: DebtTransactionRecord[];
  activeFocus: string;
  selectedStatementBakeryId: string;
  todayRef: string;
  onSelectStatementBakeryId: (id: string) => void;
  onAddTransaction: (tx: Omit<DebtTransactionRecord, 'id'>) => void;
  onSelectBakeryDetails: (bakery: BakeryRecord) => void;
}

export default function BakeryDebtsModule({
  bakeries,
  transactions,
  activeFocus,
  selectedStatementBakeryId,
  todayRef,
  onSelectStatementBakeryId,
  onAddTransaction,
  onSelectBakeryDetails,
}: BakeryDebtsModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>(activeFocus === 'dbt-all' ? 'remainingDebtEgp' : 'date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>(['name', 'receiptNumber']);

  const [txBakeryId, setTxBakeryId] = useState<string>(selectedStatementBakeryId || bakeries[0]?.id || '');
  const [txCategory, setTxCategory] = useState<DebtTransactionRecord['category']>('سداد نقدي / شيك');
  const [txAmount, setTxAmount] = useState<number>(1000);
  const [txMethod, setTxMethod] = useState<string>('توريد خزينة الإدارة');
  const [txNotes, setTxNotes] = useState<string>('');

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const summary = useMemo(() => {
    const totalDebts = bakeries.reduce((sum, b) => sum + (b.remainingDebtEgp || 0), 0);
    const totalInsurance = bakeries.reduce((sum, b) => sum + (b.insuranceAmountEgp || 0), 0);
    const totalFines = transactions
      .filter((t) => t.category === 'غرامة')
      .reduce((sum, t) => sum + t.amountEgp, 0);
    const totalPayments = transactions
      .filter((t) => t.category === 'سداد نقدي / شيك')
      .reduce((sum, t) => sum + t.amountEgp, 0);
    const totalDues = transactions
      .filter((t) => t.category === 'مستحقات مخبز')
      .reduce((sum, t) => sum + t.amountEgp, 0);
    return { totalDebts, totalInsurance, totalFines, totalPayments, totalDues };
  }, [bakeries, transactions]);

  const sortedBakeriesByDebt = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    return bakeries
      .filter((b) => {
        if (!q) return true;
        return normalizeSearchText(`${b.name} ${b.ownerName} ${b.village} ${b.bakeryNumber} ${b.posNumber}`).includes(q);
      })
      .sort((a, b) => compareTableValues(a[sortKey as keyof BakeryRecord], b[sortKey as keyof BakeryRecord], sortAsc));
  }, [bakeries, searchTerm, sortKey, sortAsc]);

  const filteredTransactions = useMemo(() => {
    const q = normalizeSearchText(searchTerm);
    const catMap: Record<string, DebtTransactionRecord['category'] | undefined> = {
      'dbt-fines': 'غرامة',
      'dbt-dues': 'مستحقات مخبز',
      'dbt-payments': 'سداد نقدي / شيك',
    };
    const catFilter = catMap[activeFocus];

    return transactions
      .filter((t) => {
        if (activeFocus === 'dbt-statement' && selectedStatementBakeryId) {
          if (t.bakeryId !== selectedStatementBakeryId) return false;
        } else if (catFilter && t.category !== catFilter) {
          return false;
        }
        if (q) {
          const text = normalizeSearchText(`${t.receiptNumber} ${t.bakeryName} ${t.village} ${t.paymentMethod} ${t.notes}`);
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        compareTableValues(a[sortKey as keyof DebtTransactionRecord], b[sortKey as keyof DebtTransactionRecord], sortAsc)
      );
  }, [transactions, activeFocus, selectedStatementBakeryId, searchTerm, sortKey, sortAsc]);

  const statementBakery = useMemo(
    () => bakeries.find((b) => b.id === selectedStatementBakeryId) || bakeries[0],
    [bakeries, selectedStatementBakeryId]
  );

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const b = bakeries.find((x) => x.id === txBakeryId) || bakeries[0];
    if (!b || txAmount <= 0) return;

    const isDebit = txCategory === 'مديونية' || txCategory === 'غرامة';
    onAddTransaction({
      receiptNumber: `${isDebit ? 'قيد' : 'إيصال'}-${todayRef.slice(0, 4)}-${Math.floor(500 + transactions.length * 17)}`,
      bakeryId: b.id,
      bakeryName: b.name,
      village: b.village,
      date: todayRef,
      category: txCategory,
      amountEgp: Number(txAmount),
      direction: isDebit ? 'debit' : 'credit',
      paymentMethod: txMethod.trim() || 'خزينة الإدارة',
      status: isDebit ? 'معتمد' : 'مسدد',
      notes: txNotes.trim() || 'حركة مالية معتمدة بمنظومة حسابات المخابز',
    });

    setTxAmount(1000);
    setTxNotes('');
    setShowAddForm(false);
  };

  const titleMap: Record<string, string> = {
    'dbt-all': 'مديونيات المخابز والأرصدة المالية الحالية',
    'dbt-fines': 'سجل الغرامات المالية المقيدة على المخابز',
    'dbt-dues': 'مستحقات المخابز وتكلفة التصنيع والإنتاج',
    'dbt-payments': 'سجل المدفوعات والتوريدات البنكية والنقدية',
    'dbt-statement': 'كشف حساب تفصيلي للمخبز',
  };

  const isPinned = (key: string) => pinnedCols.includes(key);
  const togglePin = (key: string) =>
    setPinnedCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const isDebtBalancesMode = activeFocus === 'dbt-all';

  return (
    <div className="space-y-4">
      {/* Animated Colored Financial KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <AnimatedStatCard
          title="إجمالي المديونيات القائمة"
          value={summary.totalDebts}
          format="currency"
          indicator="أرصدة مدينة"
          icon={Wallet}
          theme="red"
          compact
          delay={0}
        />
        <AnimatedStatCard
          title="إجمالي التأمينات المودعة"
          value={summary.totalInsurance}
          format="currency"
          indicator="ضمان الحصص"
          icon={BookOpenText}
          theme="navy"
          compact
          delay={0.05}
        />
        <AnimatedStatCard
          title="الغرامات المسجلة"
          value={summary.totalFines}
          format="currency"
          indicator="محاضر ومخالفات"
          icon={Scale}
          theme="gold"
          compact
          delay={0.1}
        />
        <AnimatedStatCard
          title="مستحقات المخابز"
          value={summary.totalDues}
          format="currency"
          indicator="تكلفة تصنيع"
          icon={Coins}
          theme="teal"
          compact
          delay={0.15}
        />
        <AnimatedStatCard
          title="المدفوعات المحصلة"
          value={summary.totalPayments}
          format="currency"
          indicator="توريد مكتمل"
          icon={CreditCard}
          theme="green"
          compact
          delay={0.2}
        />
      </div>

      {/* Table Counters & Pinning Controls */}
      <TableControlsBar
        totalRecords={isDebtBalancesMode ? bakeries.length : transactions.length}
        displayedRecords={isDebtBalancesMode ? sortedBakeriesByDebt.length : filteredTransactions.length}
        filteredRecords={isDebtBalancesMode ? sortedBakeriesByDebt.length : filteredTransactions.length}
        selectedRecords={selectedIds.length}
        totalColumns={isDebtBalancesMode ? 9 : 10}
        visibleColumns={isDebtBalancesMode ? 9 : 10}
        onClearSelection={() => setSelectedIds([])}
        columns={
          isDebtBalancesMode
            ? [
                { key: 'name', label: 'اسم المخبز', pinned: isPinned('name') },
                { key: 'bakeryNumber', label: 'رقم المخبز', pinned: isPinned('bakeryNumber') },
                { key: 'remainingDebtEgp', label: 'المديونية القائمة', pinned: isPinned('remainingDebtEgp') },
              ]
            : [
                { key: 'receiptNumber', label: 'رقم الإيصال / القيد', pinned: isPinned('receiptNumber') },
                { key: 'bakeryName', label: 'المخبز', pinned: isPinned('bakeryName') },
                { key: 'amountEgp', label: 'المبلغ', pinned: isPinned('amountEgp') },
              ]
        }
        onPinAll={() => setPinnedCols(isDebtBalancesMode ? ['name', 'bakeryNumber'] : ['receiptNumber', 'bakeryName'])}
        onUnpinAll={() => setPinnedCols([])}
        onTogglePinColumn={togglePin}
        onResetPinDefaults={() => setPinnedCols(['name', 'receiptNumber'])}
      />

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-[#102A43] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-black">{titleMap[activeFocus] || titleMap['dbt-all']}</h2>
            <p className="text-[11px] text-slate-300 mt-0.5">
              إدارة المديونيات والغرامات والمستحقات والمدفوعات بربط مباشر مع سجل المخابز وسجل التدقيق
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-[#C6A15B] hover:bg-[#b58f48] text-[#102A43] rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>قيد سداد / غرامة / مستحق</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-[#164E83] hover:bg-[#1e609e] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span>طباعة كشف الحساب</span>
            </button>
          </div>
        </div>

        {/* Add Financial Transaction Form */}
        {showAddForm && (
          <form onSubmit={handleCreateTransaction} className="p-4 bg-[#F4F7FB] border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-[#102A43] mb-1">المخبز *</label>
              <select
                value={txBakeryId}
                onChange={(e) => setTxBakeryId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
              >
                {bakeries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.village}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#102A43] mb-1">نوع الحركة المالية *</label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value as DebtTransactionRecord['category'])}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
              >
                <option value="سداد نقدي / شيك">سداد نقدي / شيك (يخصم من المديونية)</option>
                <option value="مستحقات مخبز">مستحقات مخبز (دائن)</option>
                <option value="غرامة">غرامة تموينية (تضاف للمديونية)</option>
                <option value="مديونية">قيد مديونية جديدة (تضاف للمديونية)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#102A43] mb-1">المبلغ (ج.م) *</label>
              <input
                type="number"
                required
                min={1}
                value={txAmount}
                onChange={(e) => setTxAmount(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-[#102A43] mb-1">وسيلة السداد / المستند</label>
              <input
                type="text"
                value={txMethod}
                onChange={(e) => setTxMethod(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
              <input
                type="text"
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                placeholder="بيان وملاحظات الحركة المالية..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer shrink-0"
              >
                اعتماد القيد وتحديث رصيد المخبز
              </button>
            </div>
          </form>
        )}

        {/* Statement Bakery Selector Bar */}
        {activeFocus === 'dbt-statement' && statementBakery && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#102A43]">اختر المخبز لعرض كشف حسابه:</label>
                <select
                  value={statementBakery.id}
                  onChange={(e) => onSelectStatementBakeryId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-[#102A43]"
                >
                  {bakeries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.village}) — رقم {toArabicNumerals(b.bakeryNumber)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="bg-white px-2.5 py-1 rounded border border-slate-200 font-bold">
                  التأمين المودع: <strong className="num-cell text-[#164E83]">{formatArabicNumber(statementBakery.insuranceAmountEgp)} ج.م</strong>
                </span>
                <span className="bg-white px-2.5 py-1 rounded border border-slate-200 font-bold">
                  الرصيد المدين الحالي:{' '}
                  <strong className={`num-cell ${statementBakery.remainingDebtEgp > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {formatArabicNumber(statementBakery.remainingDebtEgp)} ج.م
                  </strong>
                </span>
                <span className="bg-white px-2.5 py-1 rounded border border-slate-200 font-bold">
                  حالة التأمين: <strong>{statementBakery.insuranceStatus}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المخبز، القرية، رقم الإيصال أو وسيلة السداد..."
              className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Table View 1: Bakeries Debt Balances (dbt-all) */}
        {isDebtBalancesMode ? (
          <div className="overflow-auto max-h-[60vh] compact-table-scroll">
            <table className="w-full text-right">
              <thead className="bg-slate-100 text-[#102A43] border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="w-9 text-center">تحديد</th>
                  <SortableTh label="م" sortKey="serialNumber" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <SortableTh label="رقم المخبز" sortKey="bakeryNumber" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <SortableTh
                    label="اسم المخبز"
                    sortKey="name"
                    activeSortKey={sortKey}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    className={isPinned('name') ? 'sticky right-0 z-20 bg-slate-100 pinned-col-edge' : ''}
                  />
                  <SortableTh label="صاحب المخبز" sortKey="ownerName" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                  <SortableTh label="القرية" sortKey="village" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                  <SortableTh label="القيمة التأمينية" sortKey="insuranceAmountEgp" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <SortableTh label="المديونية القائمة" sortKey="remainingDebtEgp" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <SortableTh label="حالة التأمين" sortKey="insuranceStatus" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <th className="text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedBakeriesByDebt.map((b, idx) => (
                  <tr key={b.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F7FB]/60'} hover:bg-blue-50/60`}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(b.id)}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id]
                          )
                        }
                        className="w-3.5 h-3.5 accent-[#102A43] cursor-pointer"
                      />
                    </td>
                    <td className="num-cell text-center">{toArabicNumerals(b.serialNumber)}</td>
                    <td className="num-cell text-center font-bold text-[#164E83]">{toArabicNumerals(b.bakeryNumber)}</td>
                    <td
                      className={`font-bold text-[#102A43] ${
                        isPinned('name') ? 'sticky right-0 z-10 bg-white pinned-col-edge' : ''
                      }`}
                    >
                      {b.name}
                    </td>
                    <td className="text-slate-700">{b.ownerName}</td>
                    <td className="text-slate-700 whitespace-nowrap">{b.village}</td>
                    <td className="num-cell text-center">{formatArabicNumber(b.insuranceAmountEgp)} ج.م</td>
                    <td className={`num-cell text-center font-bold ${b.remainingDebtEgp > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formatArabicNumber(b.remainingDebtEgp)} ج.م
                    </td>
                    <td className="text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                          b.insuranceStatus === 'مسدد بالكامل'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {b.insuranceStatus}
                      </span>
                    </td>
                    <td className="text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectStatementBakeryId(b.id)}
                          className="px-2 py-1 bg-[#164E83] hover:bg-[#102A43] text-white rounded text-[10.5px] font-bold cursor-pointer"
                        >
                          كشف حساب
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectBakeryDetails(b)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[#102A43] border border-slate-300 rounded text-[10.5px] font-bold cursor-pointer"
                        >
                          التفاصيل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Table View 2: Transactions (Fines, Dues, Payments, Statement) */
          <div className="overflow-auto max-h-[60vh] compact-table-scroll">
            <table className="w-full text-right">
              <thead className="bg-slate-100 text-[#102A43] border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="w-9 text-center">تحديد</th>
                  <SortableTh
                    label="رقم الإيصال / القيد"
                    sortKey="receiptNumber"
                    activeSortKey={sortKey}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    className={isPinned('receiptNumber') ? 'sticky right-0 z-20 bg-slate-100 pinned-col-edge' : ''}
                  />
                  <SortableTh label="التاريخ" sortKey="date" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <SortableTh label="المخبز" sortKey="bakeryName" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                  <SortableTh label="القرية" sortKey="village" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                  <SortableTh label="التصنيف" sortKey="category" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <SortableTh label="المبلغ (ج.م)" sortKey="amountEgp" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <SortableTh label="الأثر المحاسبي" sortKey="direction" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <SortableTh label="وسيلة السداد" sortKey="paymentMethod" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                  <SortableTh label="الحالة" sortKey="status" activeSortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} align="center" />
                  <th>البيان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-500">
                      لا توجد حركات مالية مسجلة في هذا التصنيف حالياً.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, idx) => (
                    <tr key={tx.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#F4F7FB]/60'} hover:bg-blue-50/60`}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tx.id)}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(tx.id) ? prev.filter((x) => x !== tx.id) : [...prev, tx.id]
                            )
                          }
                          className="w-3.5 h-3.5 accent-[#102A43] cursor-pointer"
                        />
                      </td>
                      <td
                        className={`num-cell font-bold text-[#164E83] ${
                          isPinned('receiptNumber') ? 'sticky right-0 z-10 bg-white pinned-col-edge' : ''
                        }`}
                      >
                        {toArabicNumerals(tx.receiptNumber)}
                      </td>
                      <td className="num-cell text-center text-slate-700">{formatDateArabic(tx.date)}</td>
                      <td className="font-bold text-[#102A43]">{tx.bakeryName}</td>
                      <td className="text-slate-700 whitespace-nowrap">{tx.village}</td>
                      <td className="text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10.5px] font-bold">
                          {tx.category}
                        </span>
                      </td>
                      <td className={`num-cell text-center font-bold ${tx.direction === 'debit' ? 'text-red-700' : 'text-emerald-800'}`}>
                        {formatArabicNumber(tx.amountEgp)} ج.م
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                            tx.direction === 'debit'
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {tx.direction === 'debit' ? 'مدين (+)' : 'دائن (−)'}
                        </span>
                      </td>
                      <td className="text-slate-700 whitespace-nowrap">{tx.paymentMethod}</td>
                      <td className="text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[10.5px] font-bold">
                          {tx.status}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate text-slate-600" title={tx.notes}>
                        {toArabicNumerals(tx.notes)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
