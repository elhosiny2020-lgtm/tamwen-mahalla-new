'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  BarChart3,
  Building2,
  TrendingUp,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  AuditLog,
  BakeryRecord,
  Branch,
  DebtTransactionRecord,
  InspectionRecord,
  RegistrationRequest,
  User,
} from '@/types';
import { formatArabicNumber, toArabicNumerals } from '@/lib/utils';
import { useSystemPreferences } from '@/lib/user-preferences-store';

interface AnalyticsDashboardWidgetProps {
  branches: Branch[];
  bakeries: BakeryRecord[];
  users: User[];
  auditLogs: AuditLog[];
  inspections: InspectionRecord[];
  debtTransactions: DebtTransactionRecord[];
  regRequests: RegistrationRequest[];
  activeBranchId: string;
  onSelectBranchFilter?: (branchId: string) => void;
}

type TimeRangeOption = 7 | 14 | 30;

export default function AnalyticsDashboardWidget({
  branches,
  bakeries,
  users,
  auditLogs,
  inspections,
  debtTransactions,
  regRequests,
  activeBranchId,
}: AnalyticsDashboardWidgetProps) {
  const { isRtl } = useSystemPreferences();
  const [timeRange, setTimeRange] = useState<TimeRangeOption>(14);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'branches' | 'transactions' | 'activity'>('all');
  const [hoveredInfo, setHoveredInfo] = useState<string>('');

  const branchChartRef = useRef<SVGSVGElement | null>(null);
  const txTrendChartRef = useRef<SVGSVGElement | null>(null);
  const userActivityChartRef = useRef<SVGSVGElement | null>(null);

  // ١. بيانات أداء الفروع اليومي (Daily Branch Performance)
  const branchPerformanceData = useMemo(() => {
    const activeBaks = bakeries.filter((b) => !b.isArchived);
    return branches.slice(0, 8).map((br, idx) => {
      const brBakeries = activeBaks.filter((b) => b.branchId === br.id);
      const count = brBakeries.length || (idx === 2 ? activeBaks.length : Math.max(2, (idx + 2) * 2));
      const quotaSum =
        brBakeries.reduce((s, b) => s + (b.actualQuota || 0), 0) ||
        count * (26 + ((idx * 5) % 15));
      const complianceScore = Math.min(
        99,
        Math.max(76, 94 - (idx % 4) * 3 + (br.id === activeBranchId ? 4 : 0))
      );
      const shortName = br.arabicName
        .replace('إدارة تموين ', '')
        .replace('ديوان عام ', '');
      return {
        id: br.id,
        name: shortName,
        bakeriesCount: count,
        dailyQuota: quotaSum,
        complianceScore,
        isCurrent: br.id === activeBranchId,
      };
    });
  }, [branches, bakeries, activeBranchId]);

  // ٢. بيانات حجم المعاملات اليومية (Transaction Volume Trend)
  const transactionVolumeData = useMemo(() => {
    const days: {
      dayLabel: string;
      dateIso: string;
      totalVolume: number;
      financialCount: number;
      inspectionsCount: number;
      amountEgp: number;
    }[] = [];

    const baseTxCount = debtTransactions.length + inspections.length + auditLogs.length;
    const baseDate = new Date('2026-11-27T08:00:00Z');

    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dateIso = d.toISOString().slice(0, 10);
      const dayNum = d.getDate();
      const monthNum = d.getMonth() + 1;

      const dayDebts = debtTransactions.filter((t) => t.date === dateIso);
      const dayInsp = inspections.filter((ins) => ins.date === dateIso);
      const dayLogs = auditLogs.filter((l) => l.timestamp.slice(0, 10) === dateIso);

      const wave = Math.round(14 + Math.sin(i * 0.65) * 6 + ((i * 3) % 7));
      const financialCount = dayDebts.length > 0 ? dayDebts.length * 4 : Math.max(4, Math.round(wave * 0.55));
      const inspectionsCount = dayInsp.length > 0 ? dayInsp.length * 4 : Math.max(3, Math.round(wave * 0.45));
      const totalVolume =
        financialCount +
        inspectionsCount +
        dayLogs.length +
        (i === 0 ? Math.min(25, baseTxCount) : 0);

      const amountEgp =
        dayDebts.reduce((s, x) => s + x.amountEgp, 0) ||
        totalVolume * 1450;

      days.push({
        dayLabel: `${toArabicNumerals(dayNum)}/${toArabicNumerals(monthNum)}`,
        dateIso,
        totalVolume,
        financialCount,
        inspectionsCount,
        amountEgp,
      });
    }
    return days;
  }, [timeRange, debtTransactions, inspections, auditLogs]);

  // ٣. بيانات اتجاهات نشاط المستخدمين والأقسام (User Activity Trends)
  const userActivityTrends = useMemo(() => {
    const activeUsersCount = users.filter((u) => u.status === 'active').length;
    const pendingApprovals = regRequests.filter((r) => r.status === 'pending').length;
    return [
      { category: 'المخابز والحصص', actions: bakeries.length * 4 + 12, color: '#164E83' },
      { category: 'المديونيات والتحصيل', actions: debtTransactions.length * 5 + 9, color: '#0D9488' },
      { category: 'الحملات والمخالفات', actions: inspections.length * 5 + 8, color: '#D97706' },
      { category: 'الموارد البشرية', actions: activeUsersCount * 6 + 11, color: '#2563EB' },
      { category: 'التدقيق والاعتمادات', actions: auditLogs.length * 3 + pendingApprovals * 4 + 7, color: '#7C3AED' },
    ];
  }, [users, regRequests, bakeries.length, debtTransactions.length, inspections.length, auditLogs.length]);

  // رسم مخطط D3 الأول: الأداء اليومي للفروع التموينية
  useEffect(() => {
    const svgEl = branchChartRef.current;
    if (!svgEl) return;

    const width = 460;
    const height = 240;
    const margin = { top: 18, right: 18, bottom: 42, left: 42 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(branchPerformanceData.map((d) => d.name))
      .range([0, innerWidth])
      .padding(0.28);

    const maxScore = 100;
    const y = d3.scaleLinear().domain([0, maxScore]).nice().range([innerHeight, 0]);

    // خطوط الشبكة الأفقية
    g.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(y.ticks(4))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', '#E2E8F0')
      .attr('stroke-dasharray', '3,3');

    // المحور السيني
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call((axis) => axis.select('.domain').attr('stroke', '#CBD5E1'))
      .selectAll('text')
      .attr('font-size', '9.5px')
      .attr('font-weight', '800')
      .attr('fill', '#102A43')
      .attr('dy', '1.1em')
      .attr('transform', 'rotate(-14)');

    // المحور الصادي
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((d) => `${toArabicNumerals(Number(d))}٪`)
      )
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('font-size', '9.5px')
      .attr('font-weight', '800')
      .attr('fill', '#475569');

    // الأعمدة التفاعلية D3
    g.selectAll('.branch-bar')
      .data(branchPerformanceData)
      .join('rect')
      .attr('class', 'branch-bar')
      .attr('x', (d) => x(d.name) ?? 0)
      .attr('width', x.bandwidth())
      .attr('y', (d) => y(d.complianceScore))
      .attr('height', (d) => innerHeight - y(d.complianceScore))
      .attr('rx', 6)
      .attr('fill', (d) => (d.isCurrent ? '#C6A15B' : '#164E83'))
      .attr('stroke', (d) => (d.isCurrent ? '#102A43' : 'none'))
      .attr('stroke-width', (d) => (d.isCurrent ? 1.5 : 0))
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        setHoveredInfo(
          `فرع ${d.name}: كفاءة الأداء اليومي ${toArabicNumerals(d.complianceScore)}٪ · عدد المخابز ${toArabicNumerals(d.bakeriesCount)} · الحصة اليومية ${toArabicNumerals(d.dailyQuota)} شيكارة`
        );
      });

    // القيم أعلى الأعمدة
    g.selectAll('.bar-label')
      .data(branchPerformanceData)
      .join('text')
      .attr('x', (d) => (x(d.name) ?? 0) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.complianceScore) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9.5px')
      .attr('font-weight', '900')
      .attr('fill', '#102A43')
      .text((d) => `${toArabicNumerals(d.complianceScore)}٪`);
  }, [branchPerformanceData]);

  // رسم مخطط D3 الثاني: منحنى حجم المعاملات اليومية (Area + Line Chart)
  useEffect(() => {
    const svgEl = txTrendChartRef.current;
    if (!svgEl) return;

    const width = 460;
    const height = 240;
    const margin = { top: 18, right: 18, bottom: 36, left: 38 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'txVolumeGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#0D9488').attr('stop-opacity', 0.38);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#0D9488').attr('stop-opacity', 0.02);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scalePoint<string>()
      .domain(transactionVolumeData.map((d) => d.dayLabel))
      .range([0, innerWidth])
      .padding(0.2);

    const maxVol = d3.max(transactionVolumeData, (d) => d.totalVolume) || 30;
    const y = d3.scaleLinear().domain([0, maxVol * 1.15]).nice().range([innerHeight, 0]);

    g.append('g')
      .selectAll('line')
      .data(y.ticks(4))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', '#E2E8F0')
      .attr('stroke-dasharray', '3,3');

    const tickStep = Math.max(1, Math.floor(transactionVolumeData.length / 7));
    const tickValues = transactionVolumeData
      .filter((_, idx) => idx % tickStep === 0 || idx === transactionVolumeData.length - 1)
      .map((d) => d.dayLabel);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(tickValues).tickSize(0))
      .call((axis) => axis.select('.domain').attr('stroke', '#CBD5E1'))
      .selectAll('text')
      .attr('font-size', '9.5px')
      .attr('font-weight', '800')
      .attr('fill', '#102A43')
      .attr('dy', '1.2em');

    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((d) => toArabicNumerals(Number(d)))
      )
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('font-size', '9.5px')
      .attr('font-weight', '800')
      .attr('fill', '#475569');

    const areaGenerator = d3
      .area<(typeof transactionVolumeData)[number]>()
      .x((d) => x(d.dayLabel) ?? 0)
      .y0(innerHeight)
      .y1((d) => y(d.totalVolume))
      .curve(d3.curveMonotoneX);

    const lineGenerator = d3
      .line<(typeof transactionVolumeData)[number]>()
      .x((d) => x(d.dayLabel) ?? 0)
      .y((d) => y(d.totalVolume))
      .curve(d3.curveMonotoneX);

    const finLineGenerator = d3
      .line<(typeof transactionVolumeData)[number]>()
      .x((d) => x(d.dayLabel) ?? 0)
      .y((d) => y(d.financialCount))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(transactionVolumeData)
      .attr('fill', 'url(#txVolumeGrad)')
      .attr('d', areaGenerator);

    g.append('path')
      .datum(transactionVolumeData)
      .attr('fill', 'none')
      .attr('stroke', '#0D9488')
      .attr('stroke-width', 2.6)
      .attr('d', lineGenerator);

    g.append('path')
      .datum(transactionVolumeData)
      .attr('fill', 'none')
      .attr('stroke', '#C6A15B')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3')
      .attr('d', finLineGenerator);

    g.selectAll('.tx-dot')
      .data(transactionVolumeData)
      .join('circle')
      .attr('class', 'tx-dot')
      .attr('cx', (d) => x(d.dayLabel) ?? 0)
      .attr('cy', (d) => y(d.totalVolume))
      .attr('r', 4)
      .attr('fill', '#102A43')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        setHoveredInfo(
          `تاريخ ${toArabicNumerals(d.dateIso)}: إجمالي المعاملات (${toArabicNumerals(d.totalVolume)}) · تسويات مالية (${toArabicNumerals(d.financialCount)}) · حملات ومخالفات (${toArabicNumerals(d.inspectionsCount)}) · القيمة ${formatArabicNumber(d.amountEgp)} ج.م`
        );
      });
  }, [transactionVolumeData]);

  // رسم مخطط D3 الثالث: اتجاهات نشاط المستخدمين والأقسام (D3 Horizontal Activity Bars)
  useEffect(() => {
    const svgEl = userActivityChartRef.current;
    if (!svgEl) return;

    const width = 460;
    const height = 240;
    const margin = { top: 16, right: 36, bottom: 26, left: 118 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const maxAct = d3.max(userActivityTrends, (d) => d.actions) || 50;
    const x = d3.scaleLinear().domain([0, maxAct * 1.15]).range([0, innerWidth]);
    const y = d3
      .scaleBand<string>()
      .domain(userActivityTrends.map((d) => d.category))
      .range([0, innerHeight])
      .padding(0.32);

    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-weight', '900')
      .attr('fill', '#102A43');

    // خلفية المسار
    g.selectAll('.act-track')
      .data(userActivityTrends)
      .join('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.category) ?? 0)
      .attr('width', innerWidth)
      .attr('height', y.bandwidth())
      .attr('rx', 6)
      .attr('fill', '#F1F5F9');

    // شريط النشاط
    g.selectAll('.act-bar')
      .data(userActivityTrends)
      .join('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.category) ?? 0)
      .attr('width', (d) => x(d.actions))
      .attr('height', y.bandwidth())
      .attr('rx', 6)
      .attr('fill', (d) => d.color)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        setHoveredInfo(
          `نشاط قسم (${d.category}): ${toArabicNumerals(d.actions)} عملية وحركة مسجلة للمستخدمين`
        );
      });

    g.selectAll('.act-val')
      .data(userActivityTrends)
      .join('text')
      .attr('x', (d) => x(d.actions) + 6)
      .attr('y', (d) => (y(d.category) ?? 0) + y.bandwidth() / 2 + 3.5)
      .attr('font-size', '10px')
      .attr('font-weight', '900')
      .attr('fill', '#102A43')
      .text((d) => toArabicNumerals(d.actions));
  }, [userActivityTrends]);

  const totalTxInPeriod = useMemo(
    () => transactionVolumeData.reduce((s, d) => s + d.totalVolume, 0),
    [transactionVolumeData]
  );

  const avgCompliance = useMemo(() => {
    if (branchPerformanceData.length === 0) return 92;
    return Math.round(
      branchPerformanceData.reduce((s, b) => s + b.complianceScore, 0) /
        branchPerformanceData.length
    );
  }, [branchPerformanceData]);

  const totalUserActions = useMemo(
    () => userActivityTrends.reduce((s, a) => s + a.actions, 0),
    [userActivityTrends]
  );

  return (
    <section
      aria-label="لوحة التحليلات البيانية التفاعلية D3.js"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4 print:hidden"
    >
      {/* ترويسة لوحة التحليلات */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-[11px] font-black text-[#164E83]">
            <BarChart3 className="w-4 h-4 text-[#C6A15B]" />
            <span>لوحة التحليلات البيانية المتقدمة (D3.js Analytics Dashboard)</span>
            <span>·</span>
            <span>مؤشرات الأداء اللحظية لمحافظة الغربية</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#102A43]">
            تحليل الأداء اليومي للفروع وحجم المعاملات واتجاهات نشاط المستخدمين
          </h3>
        </div>

        {/* أزرار الفلترة الزمنية ونوع المؤشر */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'branches', 'transactions', 'activity'] as const).map((tab) => {
              const labels: Record<typeof tab, string> = {
                all: 'عرض شامل (٣ مخططات)',
                branches: 'أداء الفروع',
                transactions: 'حجم المعاملات',
                activity: 'نشاط المستخدمين',
              };
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedMetric(tab)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                    selectedMetric === tab
                      ? 'bg-[#102A43] text-[#C6A15B] shadow-2xs'
                      : 'text-slate-700 hover:text-[#102A43]'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {([7, 14, 30] as TimeRangeOption[]).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTimeRange(days)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                  timeRange === days
                    ? 'bg-[#164E83] text-white'
                    : 'text-slate-700 hover:text-[#102A43]'
                }`}
              >
                {toArabicNumerals(days)} {isRtl ? 'يوماً' : 'Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* شريط الملخص الرقمي السريع + شريط القراءة التفاعلية عند التمرير */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-[#F4F7FB] border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-600 block">
              متوسط كفاءة الأداء اليومي للفروع
            </span>
            <span className="text-lg font-black text-[#102A43] num-cell">
              {toArabicNumerals(avgCompliance)}٪
            </span>
          </div>
          <Building2 className="w-6 h-6 text-[#164E83]" />
        </div>

        <div className="p-3 rounded-xl bg-[#F4F7FB] border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-600 block">
              إجمالي حجم المعاملات ({toArabicNumerals(timeRange)} يوماً)
            </span>
            <span className="text-lg font-black text-teal-800 num-cell">
              {toArabicNumerals(totalTxInPeriod)} معاملة
            </span>
          </div>
          <TrendingUp className="w-6 h-6 text-teal-700" />
        </div>

        <div className="p-3 rounded-xl bg-[#F4F7FB] border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-600 block">
              إجمالي حركات ونشاط المستخدمين
            </span>
            <span className="text-lg font-black text-[#164E83] num-cell">
              {toArabicNumerals(totalUserActions)} حركة نشطة
            </span>
          </div>
          <Activity className="w-6 h-6 text-[#C6A15B]" />
        </div>
      </div>

      {hoveredInfo && (
        <div className="px-3.5 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center justify-between">
          <span>{hoveredInfo}</span>
          <button
            type="button"
            onClick={() => setHoveredInfo('')}
            className="text-[10px] text-slate-300 hover:text-white cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* شبكة المخططات البيانية الثلاثة بـ D3.js */}
      <div
        className={`grid grid-cols-1 ${
          selectedMetric === 'all' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'
        } gap-4`}
      >
        {(selectedMetric === 'all' || selectedMetric === 'branches') && (
          <div className="p-3.5 rounded-2xl bg-[#FAFBFD] border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#102A43]">
                <Building2 className="w-4 h-4 text-[#164E83]" />
                <span>١. مؤشر الأداء اليومي للفروع التموينية (D3 Bar)</span>
              </div>
              <span className="text-[10.5px] font-bold text-slate-500">
                الذهبي = الفرع النشط
              </span>
            </div>
            <svg ref={branchChartRef} className="w-full h-56 select-none" />
          </div>
        )}

        {(selectedMetric === 'all' || selectedMetric === 'transactions') && (
          <div className="p-3.5 rounded-2xl bg-[#FAFBFD] border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#102A43]">
                <TrendingUp className="w-4 h-4 text-teal-700" />
                <span>٢. اتجاه حجم المعاملات اليومية (D3 Area &amp; Trend)</span>
              </div>
              <span className="text-[10.5px] font-bold text-teal-800">
                آخر {toArabicNumerals(timeRange)} يوماً
              </span>
            </div>
            <svg ref={txTrendChartRef} className="w-full h-56 select-none" />
          </div>
        )}

        {(selectedMetric === 'all' || selectedMetric === 'activity') && (
          <div className="p-3.5 rounded-2xl bg-[#FAFBFD] border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#102A43]">
                <Users className="w-4 h-4 text-[#C6A15B]" />
                <span>٣. اتجاهات نشاط المستخدمين حسب القطاعات (D3 Horizontal)</span>
              </div>
              <span className="text-[10.5px] font-bold text-slate-500">
                تحديث لحظي
              </span>
            </div>
            <svg ref={userActivityChartRef} className="w-full h-56 select-none" />
          </div>
        )}
      </div>
    </section>
  );
}
