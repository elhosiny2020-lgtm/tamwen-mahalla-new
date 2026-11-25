'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Building2, ShieldCheck, UserCheck, Search } from 'lucide-react';
import {
  INITIAL_USERS,
  INITIAL_BRANCHES,
  INITIAL_REGISTRATION_REQUESTS,
  INITIAL_AUDIT_LOGS,
  getStoredUsers,
  saveStoredUsers,
  getStoredBranches,
  getStoredRegistrationRequests,
  saveStoredRegistrationRequests,
  getStoredAuditLogs,
  addAuditLog,
} from '@/lib/mock-db';
import {
  formatDateArabic,
  compareTableValues,
  toArabicNumerals,
  getRoleArabicLabel,
  normalizeSearchText,
} from '@/lib/utils';
import { User, Branch, RegistrationRequest, AuditLog } from '@/types';
import SortableTh from './SortableTh';
import AnimatedStatCard from './AnimatedStatCard';
import TableControlsBar from './TableControlsBar';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'branches' | 'audit'>('requests');

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [requests, setRequests] = useState<RegistrationRequest[]>(INITIAL_REGISTRATION_REQUESTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>(['fullName']);

  const [reqSort, setReqSort] = useState<{ key: string; asc: boolean }>({ key: 'createdAt', asc: false });
  const [userSort, setUserSort] = useState<{ key: string; asc: boolean }>({ key: 'fullName', asc: true });
  const [auditSort, setAuditSort] = useState<{ key: string; asc: boolean }>({ key: 'timestamp', asc: false });

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setUsers(getStoredUsers());
      setBranches(getStoredBranches());
      setRequests(getStoredRegistrationRequests());
      setAuditLogs(getStoredAuditLogs());
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  const normQuery = normalizeSearchText(searchTerm);

  const sortedRequests = useMemo(() => {
    const filtered = normQuery
      ? requests.filter((r) =>
          normalizeSearchText(`${r.fullName} ${r.username} ${r.nationalId} ${r.jobTitle} ${getRoleArabicLabel(r.requestedRole)}`).includes(normQuery)
        )
      : requests;
    return [...filtered].sort((a, b) =>
      compareTableValues(a[reqSort.key as keyof RegistrationRequest], b[reqSort.key as keyof RegistrationRequest], reqSort.asc)
    );
  }, [requests, reqSort, normQuery]);

  const sortedUsers = useMemo(() => {
    const filtered = normQuery
      ? users.filter((u) =>
          normalizeSearchText(`${u.fullName} ${u.username} ${u.jobTitle} ${getRoleArabicLabel(u.role)}`).includes(normQuery)
        )
      : users;
    return [...filtered].sort((a, b) =>
      compareTableValues(a[userSort.key as keyof User], b[userSort.key as keyof User], userSort.asc)
    );
  }, [users, userSort, normQuery]);

  const sortedAuditLogs = useMemo(() => {
    const filtered = normQuery
      ? auditLogs.filter((l) =>
          normalizeSearchText(`${l.fullName} ${l.action} ${l.module} ${l.details} ${l.ipAddress}`).includes(normQuery)
        )
      : auditLogs;
    return [...filtered].sort((a, b) =>
      compareTableValues(a[auditSort.key as keyof AuditLog], b[auditSort.key as keyof AuditLog], auditSort.asc)
    );
  }, [auditLogs, auditSort, normQuery]);

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleApproveRequest = (req: RegistrationRequest) => {
    const newUser: User = {
      id: `usr-${users.length + 100}`,
      fullName: req.fullName,
      nationalId: req.nationalId,
      phone: req.phone,
      email: req.email || `${req.username}@supply.gov.eg`,
      username: req.username,
      jobTitle: req.jobTitle,
      jobGrade: req.jobGrade,
      workplace: req.workplace,
      branchIds: req.branchIds,
      primaryBranchId: req.primaryBranchId,
      departmentIds: req.requestedDepartments,
      role: req.requestedRole,
      status: 'active',
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [newUser, ...users];
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    const updatedReqs = requests.map((r) =>
      r.id === req.id ? { ...r, status: 'approved' as const, reviewedAt: new Date().toISOString() } : r
    );
    setRequests(updatedReqs);
    saveStoredRegistrationRequests(updatedReqs);

    addAuditLog({
      userId: 'admin',
      username: 'admin',
      fullName: 'مدير النظام',
      action: 'اعتماد مستخدم جديد',
      module: 'إدارة المستخدمين',
      branchId: req.primaryBranchId,
      details: `تم اعتماد المستخدم (${req.fullName}) بدور (${getRoleArabicLabel(req.requestedRole)})`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'success',
    });
    setAuditLogs(getStoredAuditLogs());
  };

  const handleRejectRequest = (reqId: string) => {
    const updatedReqs = requests.map((r) =>
      r.id === reqId ? { ...r, status: 'rejected' as const, reviewedAt: new Date().toISOString() } : r
    );
    setRequests(updatedReqs);
    saveStoredRegistrationRequests(updatedReqs);
  };

  const handleToggleUserStatus = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextStatus: 'active' | 'suspended' = u.status === 'active' ? 'suspended' : 'active';
        return { ...u, status: nextStatus };
      }
      return u;
    });
    setUsers(updated);
    saveStoredUsers(updated);
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const activeCount = users.filter((u) => u.status === 'active').length;

  const isPinned = (key: string) => pinnedCols.includes(key);
  const togglePin = (key: string) =>
    setPinnedCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="space-y-5">
      {/* Animated Colored KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="إجمالي المستخدمين"
          value={users.length}
          indicator={`نشط: ${toArabicNumerals(activeCount)}`}
          icon={Users}
          theme="navy"
          delay={0}
          onClick={() => setActiveTab('users')}
        />
        <AnimatedStatCard
          title="طلبات التسجيل الجديدة"
          value={pendingCount}
          indicator="تحتاج مراجعة واعتماد"
          icon={UserCheck}
          theme="gold"
          delay={0.05}
          onClick={() => setActiveTab('requests')}
        />
        <AnimatedStatCard
          title="إدارات وفروع التموين"
          value={branches.length}
          indicator="محافظة الغربية"
          icon={Building2}
          theme="green"
          delay={0.1}
          onClick={() => setActiveTab('branches')}
        />
        <AnimatedStatCard
          title="سجل التدقيق الأمني"
          value={auditLogs.length}
          indicator="توثيق أمني كامل"
          icon={ShieldCheck}
          theme="purple"
          delay={0.15}
          onClick={() => setActiveTab('audit')}
        />
      </div>

      {/* Tabs Navigation & Search */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab('requests'); setSelectedIds([]); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'requests' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>طلبات التسجيل</span>
            {pendingCount > 0 && (
              <span className="bg-[#C6A15B] text-[#102A43] px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums">
                {toArabicNumerals(pendingCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('users'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            إدارة المستخدمين ({toArabicNumerals(users.length)})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('branches'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'branches' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            إدارة الفروع ({toArabicNumerals(branches.length)} فرعاً)
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('audit'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            سجل التدقيق الأمني ({toArabicNumerals(auditLogs.length)})
          </button>
        </div>

        <div className="relative min-w-[220px] flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث فوري بالاسم أو الرقم القومي..."
            className="w-full pr-8 pl-3 py-1.5 bg-[#F4F7FB] border border-slate-300 rounded-xl text-xs font-bold text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#164E83]"
          />
        </div>
      </div>

      {/* Tab Content: Registration Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          <TableControlsBar
            totalRecords={requests.length}
            displayedRecords={sortedRequests.length}
            filteredRecords={sortedRequests.length}
            selectedRecords={selectedIds.length}
            totalColumns={7}
            visibleColumns={7}
            onClearSelection={() => setSelectedIds([])}
            columns={[
              { key: 'fullName', label: 'الاسم الرباعي', pinned: isPinned('fullName') },
              { key: 'username', label: 'اسم المستخدم', pinned: isPinned('username') },
              { key: 'nationalId', label: 'الرقم القومي', pinned: isPinned('nationalId') },
              { key: 'jobTitle', label: 'المسمى الوظيفي', pinned: isPinned('jobTitle') },
              { key: 'requestedRole', label: 'الدور المطلوب', pinned: isPinned('requestedRole') },
            ]}
            onPinAll={() => setPinnedCols(['fullName', 'username'])}
            onUnpinAll={() => setPinnedCols([])}
            onTogglePinColumn={togglePin}
            onResetPinDefaults={() => setPinnedCols(['fullName'])}
          />

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black text-[#102A43]">طلبات إنشاء الحسابات الجديدة الواردة</h3>
              <span className="text-xs font-bold text-slate-500">تتطلب مراجعة واعتماد مدير النظام</span>
            </div>

            <div className="overflow-auto max-h-[60vh] compact-table-scroll">
              <table className="w-full text-right">
                <thead className="bg-[#102A43] text-white sticky top-0 z-10">
                  <tr>
                    <th className="w-9 text-center">تحديد</th>
                    <SortableTh
                      label="الاسم الرباعي"
                      sortKey="fullName"
                      activeSortKey={reqSort.key}
                      sortAsc={reqSort.asc}
                      onSort={(k) => setReqSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))}
                      className={isPinned('fullName') ? 'sticky right-0 z-20 bg-[#102A43] pinned-col-edge' : ''}
                    />
                    <SortableTh label="اسم المستخدم" sortKey="username" activeSortKey={reqSort.key} sortAsc={reqSort.asc} onSort={(k) => setReqSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="الرقم القومي" sortKey="nationalId" activeSortKey={reqSort.key} sortAsc={reqSort.asc} onSort={(k) => setReqSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} align="center" />
                    <SortableTh label="المسمى الوظيفي" sortKey="jobTitle" activeSortKey={reqSort.key} sortAsc={reqSort.asc} onSort={(k) => setReqSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="الدور المطلوب" sortKey="requestedRole" activeSortKey={reqSort.key} sortAsc={reqSort.asc} onSort={(k) => setReqSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="الحالة" sortKey="status" activeSortKey={reqSort.key} sortAsc={reqSort.asc} onSort={(k) => setReqSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} align="center" />
                    <th className="text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">لا توجد طلبات تسجيل مطابقة حالياً.</td>
                    </tr>
                  ) : (
                    sortedRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(req.id)}
                            onChange={() => toggleSelectRow(req.id)}
                            className="w-3.5 h-3.5 accent-[#102A43] cursor-pointer"
                          />
                        </td>
                        <td className={`font-bold text-[#102A43] ${isPinned('fullName') ? 'sticky right-0 z-10 bg-white pinned-col-edge' : ''}`}>
                          {req.fullName}
                        </td>
                        <td className="text-slate-700">{req.username}</td>
                        <td className="num-cell text-center text-slate-700">{toArabicNumerals(req.nationalId)}</td>
                        <td className="text-slate-700">{req.jobTitle}</td>
                        <td className="font-bold text-[#164E83]">{getRoleArabicLabel(req.requestedRole)}</td>
                        <td className="text-center whitespace-nowrap">
                          {req.status === 'pending' && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">قيد المراجعة</span>}
                          {req.status === 'approved' && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">تم الاعتماد</span>}
                          {req.status === 'rejected' && <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] font-bold">مرفوض</span>}
                        </td>
                        <td className="text-center whitespace-nowrap">
                          {req.status === 'pending' && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(req)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                              >
                                اعتماد وتفعيل
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectRequest(req.id)}
                                className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                              >
                                رفض
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Users */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <TableControlsBar
            totalRecords={users.length}
            displayedRecords={sortedUsers.length}
            filteredRecords={sortedUsers.length}
            selectedRecords={selectedIds.length}
            totalColumns={6}
            visibleColumns={6}
            onClearSelection={() => setSelectedIds([])}
            columns={[
              { key: 'fullName', label: 'اسم الموظف', pinned: isPinned('fullName') },
              { key: 'username', label: 'اسم المستخدم', pinned: isPinned('username') },
              { key: 'jobTitle', label: 'المسمى الوظيفي', pinned: isPinned('jobTitle') },
              { key: 'role', label: 'الدور الوظيفي', pinned: isPinned('role') },
            ]}
            onPinAll={() => setPinnedCols(['fullName'])}
            onUnpinAll={() => setPinnedCols([])}
            onTogglePinColumn={togglePin}
            onResetPinDefaults={() => setPinnedCols(['fullName'])}
          />

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black text-[#102A43]">إدارة حسابات العاملين والموظفين</h3>
              <span className="text-xs font-bold text-slate-500">إجمالي الحسابات: {toArabicNumerals(users.length)}</span>
            </div>

            <div className="overflow-auto max-h-[60vh] compact-table-scroll">
              <table className="w-full text-right">
                <thead className="bg-[#102A43] text-white sticky top-0 z-10">
                  <tr>
                    <th className="w-9 text-center">تحديد</th>
                    <SortableTh
                      label="اسم الموظف"
                      sortKey="fullName"
                      activeSortKey={userSort.key}
                      sortAsc={userSort.asc}
                      onSort={(k) => setUserSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))}
                      className={isPinned('fullName') ? 'sticky right-0 z-20 bg-[#102A43] pinned-col-edge' : ''}
                    />
                    <SortableTh label="اسم المستخدم" sortKey="username" activeSortKey={userSort.key} sortAsc={userSort.asc} onSort={(k) => setUserSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="المسمى الوظيفي" sortKey="jobTitle" activeSortKey={userSort.key} sortAsc={userSort.asc} onSort={(k) => setUserSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="الدور الوظيفي" sortKey="role" activeSortKey={userSort.key} sortAsc={userSort.asc} onSort={(k) => setUserSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="الحالة" sortKey="status" activeSortKey={userSort.key} sortAsc={userSort.asc} onSort={(k) => setUserSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} align="center" />
                    <th className="text-center">التحكم بالحساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(u.id)}
                          onChange={() => toggleSelectRow(u.id)}
                          className="w-3.5 h-3.5 accent-[#102A43] cursor-pointer"
                        />
                      </td>
                      <td className={`font-bold text-[#102A43] ${isPinned('fullName') ? 'sticky right-0 z-10 bg-white pinned-col-edge' : ''}`}>
                        {u.fullName}
                      </td>
                      <td className="text-slate-700">{u.username}</td>
                      <td className="text-slate-600">{u.jobTitle}</td>
                      <td className="font-bold text-[#164E83]">{getRoleArabicLabel(u.role)}</td>
                      <td className="text-center whitespace-nowrap">
                        {u.status === 'active' ? (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">نشط</span>
                        ) : (
                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] font-bold">موقوف</span>
                        )}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        {u.role !== 'super_admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              u.status === 'active'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {u.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Branches */}
      {activeTab === 'branches' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-sm font-black text-[#102A43]">
              إدارة فروع وإدارات التموين بالمحافظة ({toArabicNumerals(branches.length)} فرعاً إدارياً)
            </h3>
            <span className="text-xs font-bold text-emerald-700">العزل الإداري للفروع مفعل</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {branches.map((b, idx) => (
              <div key={b.id} className="bg-[#FAFBFD] rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs bg-[#102A43] text-[#C6A15B] px-2 py-0.5 rounded font-black">
                      إدارة رقم {toArabicNumerals(idx + 1)}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      نشط ومؤمن
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#102A43] mb-1">{b.arabicName}</h4>
                  <p className="text-xs font-bold text-slate-600 mb-1">المدير المسؤول: {b.managerName}</p>
                  <p className="text-xs text-slate-600 font-bold">الهاتف: <span className="num-cell">{toArabicNumerals(b.phone)}</span></p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-slate-500">{b.address}</span>
                  <span className="text-[#164E83] font-black">صلاحيات كاملة</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <TableControlsBar
            totalRecords={auditLogs.length}
            displayedRecords={sortedAuditLogs.length}
            filteredRecords={sortedAuditLogs.length}
            selectedRecords={selectedIds.length}
            totalColumns={7}
            visibleColumns={7}
            onClearSelection={() => setSelectedIds([])}
            columns={[
              { key: 'timestamp', label: 'التاريخ والوقت', pinned: isPinned('timestamp') },
              { key: 'fullName', label: 'المستخدم', pinned: isPinned('fullName') },
              { key: 'action', label: 'العملية', pinned: isPinned('action') },
            ]}
            onPinAll={() => setPinnedCols(['timestamp', 'fullName'])}
            onUnpinAll={() => setPinnedCols([])}
            onTogglePinColumn={togglePin}
            onResetPinDefaults={() => setPinnedCols(['timestamp'])}
          />

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black text-[#102A43]">سجل النشاط والتدقيق الأمني غير القابل للتعديل</h3>
              <span className="text-xs font-bold text-slate-500">يوثق كافة العمليات والمحاولات</span>
            </div>

            <div className="overflow-auto max-h-[60vh] compact-table-scroll">
              <table className="w-full text-right">
                <thead className="bg-[#102A43] text-white sticky top-0 z-10">
                  <tr>
                    <th className="w-9 text-center">تحديد</th>
                    <SortableTh label="التاريخ والوقت" sortKey="timestamp" activeSortKey={auditSort.key} sortAsc={auditSort.asc} onSort={(k) => setAuditSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} align="center" />
                    <SortableTh label="المستخدم" sortKey="fullName" activeSortKey={auditSort.key} sortAsc={auditSort.asc} onSort={(k) => setAuditSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="العملية" sortKey="action" activeSortKey={auditSort.key} sortAsc={auditSort.asc} onSort={(k) => setAuditSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="القسم / الوحدة" sortKey="module" activeSortKey={auditSort.key} sortAsc={auditSort.asc} onSort={(k) => setAuditSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="التفاصيل" sortKey="details" activeSortKey={auditSort.key} sortAsc={auditSort.asc} onSort={(k) => setAuditSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} />
                    <SortableTh label="عنوان الشبكة" sortKey="ipAddress" activeSortKey={auditSort.key} sortAsc={auditSort.asc} onSort={(k) => setAuditSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} align="center" />
                    <SortableTh label="النتيجة" sortKey="status" activeSortKey={auditSort.key} sortAsc={auditSort.asc} onSort={(k) => setAuditSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))} align="center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(log.id)}
                          onChange={() => toggleSelectRow(log.id)}
                          className="w-3.5 h-3.5 accent-[#102A43] cursor-pointer"
                        />
                      </td>
                      <td className="num-cell text-center text-slate-600">{formatDateArabic(log.timestamp, true)}</td>
                      <td className="font-bold text-[#102A43]">{log.fullName}</td>
                      <td className="font-bold text-[#164E83]">{log.action}</td>
                      <td className="text-slate-700">{log.module}</td>
                      <td className="text-slate-600 max-w-[240px] truncate" title={log.details}>
                        {toArabicNumerals(log.details)}
                      </td>
                      <td className="num-cell text-center text-slate-500">{toArabicNumerals(log.ipAddress)}</td>
                      <td className="text-center whitespace-nowrap">
                        {log.status === 'success' ? (
                          <span className="text-emerald-700 font-bold">ناجح ✓</span>
                        ) : (
                          <span className="text-red-700 font-bold">فشل ✕</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
