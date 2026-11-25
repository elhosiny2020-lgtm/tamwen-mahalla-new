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
  toArabicNumerals,
  getRoleArabicLabel,
  normalizeSearchText,
} from '@/lib/utils';
import { User, Branch, RegistrationRequest, AuditLog } from '@/types';
import AnimatedStatCard from './AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';

export default function AdminDashboard({ userId = 'default' }: { userId?: string }) {
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'branches' | 'audit'>('requests');

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [requests, setRequests] = useState<RegistrationRequest[]>(INITIAL_REGISTRATION_REQUESTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>(['fullName']);
  const [toastMsg, setToastMsg] = useState('');

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

  const showNotice = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const normQuery = normalizeSearchText(searchTerm);

  const filteredRequests = useMemo(() => {
    return normQuery
      ? requests.filter((r) =>
          normalizeSearchText(`${r.fullName} ${r.username} ${r.nationalId} ${r.jobTitle} ${getRoleArabicLabel(r.requestedRole)}`).includes(normQuery)
        )
      : requests;
  }, [requests, normQuery]);

  const filteredUsers = useMemo(() => {
    return normQuery
      ? users.filter((u) =>
          normalizeSearchText(`${u.fullName} ${u.username} ${u.jobTitle} ${getRoleArabicLabel(u.role)}`).includes(normQuery)
        )
      : users;
  }, [users, normQuery]);

  const filteredAuditLogs = useMemo(() => {
    return normQuery
      ? auditLogs.filter((l) =>
          normalizeSearchText(`${l.fullName} ${l.action} ${l.module} ${l.details} ${l.ipAddress}`).includes(normQuery)
        )
      : auditLogs;
  }, [auditLogs, normQuery]);

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
    showNotice(`تم اعتماد حساب ${req.fullName} بنجاح`);
  };

  const handleRejectRequest = (reqId: string) => {
    const updatedReqs = requests.map((r) =>
      r.id === reqId ? { ...r, status: 'rejected' as const, reviewedAt: new Date().toISOString() } : r
    );
    setRequests(updatedReqs);
    saveStoredRegistrationRequests(updatedReqs);
    showNotice('تم رفض طلب التسجيل');
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
    showNotice('تم تحديث حالة حساب المستخدم');
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const activeCount = users.filter((u) => u.status === 'active').length;

  const togglePin = (key: string) =>
    setPinnedCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const requestColumns: SmartTableColumn<RegistrationRequest>[] = [
    {
      key: 'fullName',
      label: 'الاسم الرباعي',
      headerText: 'الاسم الرباعي',
      type: 'name',
      defaultWidth: 190,
      render: (req) => <span className="font-extrabold text-[#102A43]">{req.fullName}</span>,
    },
    {
      key: 'username',
      label: 'اسم المستخدم',
      headerText: 'اسم المستخدم',
      type: 'text',
      defaultWidth: 130,
      render: (req) => <span className="text-slate-700 font-bold">{req.username}</span>,
    },
    {
      key: 'nationalId',
      label: 'الرقم القومي',
      headerText: 'الرقم القومي',
      type: 'numeric',
      align: 'center',
      defaultWidth: 145,
      measureValue: (req) => toArabicNumerals(req.nationalId),
      render: (req) => <span className="text-slate-800">{toArabicNumerals(req.nationalId)}</span>,
    },
    {
      key: 'jobTitle',
      label: 'المسمى الوظيفي',
      headerText: 'المسمى الوظيفي',
      type: 'name',
      defaultWidth: 170,
      render: (req) => <span className="text-slate-700">{req.jobTitle}</span>,
    },
    {
      key: 'requestedRole',
      label: 'الدور المطلوب',
      headerText: 'الدور المطلوب',
      type: 'badge',
      defaultWidth: 150,
      sortValue: (req) => getRoleArabicLabel(req.requestedRole),
      measureValue: (req) => getRoleArabicLabel(req.requestedRole),
      render: (req) => <span className="font-extrabold text-[#164E83]">{getRoleArabicLabel(req.requestedRole)}</span>,
    },
    {
      key: 'status',
      label: 'الحالة',
      headerText: 'الحالة',
      type: 'badge',
      align: 'center',
      defaultWidth: 115,
      render: (req) => (
        <>
          {req.status === 'pending' && <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold">قيد المراجعة</span>}
          {req.status === 'approved' && <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold">تم الاعتماد</span>}
          {req.status === 'rejected' && <span className="bg-red-100 text-red-900 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold">مرفوض</span>}
        </>
      ),
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      headerText: 'الإجراءات',
      type: 'actions',
      align: 'center',
      sortable: false,
      defaultWidth: 175,
      render: (req) =>
        req.status === 'pending' ? (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => handleApproveRequest(req)}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10.5px] font-extrabold shadow-xs cursor-pointer"
            >
              اعتماد وتفعيل
            </button>
            <button
              type="button"
              onClick={() => handleRejectRequest(req.id)}
              className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-[10.5px] font-extrabold shadow-xs cursor-pointer"
            >
              رفض
            </button>
          </div>
        ) : (
          <span className="text-slate-400 text-[10.5px]">منجز</span>
        ),
    },
  ];

  const userColumns: SmartTableColumn<User>[] = [
    {
      key: 'fullName',
      label: 'اسم الموظف',
      headerText: 'اسم الموظف',
      type: 'name',
      defaultWidth: 190,
      render: (u) => <span className="font-extrabold text-[#102A43]">{u.fullName}</span>,
    },
    {
      key: 'username',
      label: 'اسم المستخدم',
      headerText: 'اسم المستخدم',
      type: 'text',
      defaultWidth: 130,
      render: (u) => <span className="text-slate-700">{u.username}</span>,
    },
    {
      key: 'jobTitle',
      label: 'المسمى الوظيفي',
      headerText: 'المسمى الوظيفي',
      type: 'name',
      defaultWidth: 175,
      render: (u) => <span className="text-slate-700">{u.jobTitle}</span>,
    },
    {
      key: 'role',
      label: 'الدور الوظيفي',
      headerText: 'الدور الوظيفي',
      type: 'badge',
      defaultWidth: 155,
      sortValue: (u) => getRoleArabicLabel(u.role),
      measureValue: (u) => getRoleArabicLabel(u.role),
      render: (u) => <span className="font-extrabold text-[#164E83]">{getRoleArabicLabel(u.role)}</span>,
    },
    {
      key: 'status',
      label: 'الحالة',
      headerText: 'الحالة',
      type: 'badge',
      align: 'center',
      defaultWidth: 105,
      render: (u) =>
        u.status === 'active' ? (
          <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold">نشط</span>
        ) : (
          <span className="bg-red-100 text-red-900 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold">موقوف</span>
        ),
    },
    {
      key: 'actions',
      label: 'التحكم بالحساب',
      headerText: 'التحكم بالحساب',
      type: 'actions',
      align: 'center',
      sortable: false,
      defaultWidth: 145,
      render: (u) =>
        u.role !== 'super_admin' ? (
          <button
            type="button"
            onClick={() => handleToggleUserStatus(u.id)}
            className={`px-3 py-1 rounded-lg text-[10.5px] font-extrabold cursor-pointer ${
              u.status === 'active'
                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            }`}
          >
            {u.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
          </button>
        ) : (
          <span className="text-slate-400 text-[10.5px]">حساب سيادي</span>
        ),
    },
  ];

  const auditColumns: SmartTableColumn<AuditLog>[] = [
    {
      key: 'timestamp',
      label: 'التاريخ والوقت',
      headerText: 'التاريخ والوقت',
      type: 'date',
      align: 'center',
      defaultWidth: 155,
      measureValue: (l) => formatDateArabic(l.timestamp, true),
      render: (l) => <span className="text-slate-700">{formatDateArabic(l.timestamp, true)}</span>,
    },
    {
      key: 'fullName',
      label: 'المستخدم',
      headerText: 'المستخدم',
      type: 'name',
      defaultWidth: 165,
      render: (l) => <span className="font-extrabold text-[#102A43]">{l.fullName}</span>,
    },
    {
      key: 'action',
      label: 'العملية',
      headerText: 'العملية',
      type: 'text',
      defaultWidth: 155,
      render: (l) => <span className="font-extrabold text-[#164E83]">{l.action}</span>,
    },
    {
      key: 'module',
      label: 'القسم / الوحدة',
      headerText: 'القسم / الوحدة',
      type: 'text',
      defaultWidth: 145,
      render: (l) => <span className="text-slate-700">{l.module}</span>,
    },
    {
      key: 'details',
      label: 'التفاصيل',
      headerText: 'التفاصيل',
      type: 'longText',
      defaultWidth: 260,
      measureValue: (l) => toArabicNumerals(l.details),
      render: (l) => <span className="text-slate-700">{toArabicNumerals(l.details)}</span>,
    },
    {
      key: 'ipAddress',
      label: 'عنوان الشبكة',
      headerText: 'عنوان الشبكة',
      type: 'numeric',
      align: 'center',
      defaultWidth: 130,
      measureValue: (l) => toArabicNumerals(l.ipAddress),
      render: (l) => <span className="text-slate-600">{toArabicNumerals(l.ipAddress)}</span>,
    },
    {
      key: 'status',
      label: 'النتيجة',
      headerText: 'النتيجة',
      type: 'badge',
      align: 'center',
      defaultWidth: 100,
      render: (l) =>
        l.status === 'success' ? (
          <span className="text-emerald-800 font-extrabold">ناجح ✓</span>
        ) : (
          <span className="text-red-800 font-extrabold">فشل ✕</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      {toastMsg && (
        <div className="bg-[#102A43] text-[#C6A15B] px-4 py-2.5 rounded-xl text-[11px] font-black shadow-md flex items-center justify-between">
          <span>{toastMsg}</span>
        </div>
      )}

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
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('requests'); setSelectedIds([]); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'requests' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>طلبات التسجيل</span>
            {pendingCount > 0 && (
              <span className="bg-[#C6A15B] text-[#102A43] px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums">
                {toArabicNumerals(pendingCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('users'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            إدارة المستخدمين ({toArabicNumerals(users.length)})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('branches'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'branches' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            إدارة الفروع ({toArabicNumerals(branches.length)} فرعاً)
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('audit'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            سجل التدقيق الأمني ({toArabicNumerals(auditLogs.length)})
          </button>
        </div>

        <div className="relative min-w-[230px] flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث فوري بالاسم أو الرقم القومي..."
            className="w-full pr-9 pl-3 py-2 bg-[#F4F7FB] border border-slate-300 rounded-xl text-[11px] font-bold text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#164E83]"
          />
        </div>
      </div>

      {/* Tab Content: Registration Requests */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-3">
            <h3 className="text-[13px] font-black text-[#102A43]">طلبات إنشاء الحسابات الجديدة الواردة</h3>
            <span className="text-[11px] font-bold text-slate-600">تتطلب مراجعة واعتماد مدير النظام</span>
          </div>

          <SmartAutoFitTable
            tableId="admin_requests"
            userId={userId}
            rows={filteredRequests}
            totalCount={requests.length}
            getRowId={(r) => r.id}
            columns={requestColumns}
            sortKey={reqSort.key}
            sortAsc={reqSort.asc}
            onSort={(k) => setReqSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))}
            selectable
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectRow}
            onClearSelection={() => setSelectedIds([])}
            pinnedKeys={pinnedCols}
            onTogglePinColumn={togglePin}
            onPinAll={() => setPinnedCols(['fullName', 'username'])}
            onUnpinAll={() => setPinnedCols([])}
            onResetPinDefaults={() => setPinnedCols(['fullName'])}
            onNotify={showNotice}
            emptyMessage="لا توجد طلبات تسجيل مطابقة حالياً."
          />
        </div>
      )}

      {/* Tab Content: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-3">
            <h3 className="text-[13px] font-black text-[#102A43]">إدارة حسابات العاملين والموظفين</h3>
            <span className="text-[11px] font-bold text-slate-600">إجمالي الحسابات: <span className="num-cell">{toArabicNumerals(users.length)}</span></span>
          </div>

          <SmartAutoFitTable
            tableId="admin_users"
            userId={userId}
            rows={filteredUsers}
            totalCount={users.length}
            getRowId={(u) => u.id}
            columns={userColumns}
            sortKey={userSort.key}
            sortAsc={userSort.asc}
            onSort={(k) => setUserSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))}
            selectable
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectRow}
            onClearSelection={() => setSelectedIds([])}
            pinnedKeys={pinnedCols}
            onTogglePinColumn={togglePin}
            onPinAll={() => setPinnedCols(['fullName', 'username'])}
            onUnpinAll={() => setPinnedCols([])}
            onResetPinDefaults={() => setPinnedCols(['fullName'])}
            onNotify={showNotice}
            emptyMessage="لا توجد حسابات مطابقة حالياً."
          />
        </div>
      )}

      {/* Tab Content: Branches */}
      {activeTab === 'branches' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-[13px] font-black text-[#102A43]">
              إدارة فروع وإدارات التموين بالمحافظة ({toArabicNumerals(branches.length)} فرعاً إدارياً)
            </h3>
            <span className="text-[11px] font-extrabold text-emerald-700">العزل الإداري للفروع مفعل</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {branches.map((b, idx) => (
              <div key={b.id} className="bg-[#FAFBFD] rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] bg-[#102A43] text-[#C6A15B] px-2.5 py-0.5 rounded font-black">
                      إدارة رقم {toArabicNumerals(idx + 1)}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      نشط ومؤمن
                    </span>
                  </div>
                  <h4 className="text-[13px] font-black text-[#102A43] mb-1">{b.arabicName}</h4>
                  <p className="text-[11px] font-bold text-slate-700 mb-1">المدير المسؤول: {b.managerName}</p>
                  <p className="text-[11px] text-slate-700 font-bold">الهاتف: <span className="num-cell">{toArabicNumerals(b.phone)}</span></p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 font-bold">{b.address}</span>
                  <span className="text-[#164E83] font-black">صلاحيات كاملة</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-3">
            <h3 className="text-[13px] font-black text-[#102A43]">سجل النشاط والتدقيق الأمني غير القابل للتعديل</h3>
            <span className="text-[11px] font-bold text-slate-600">يوثق كافة العمليات والمحاولات</span>
          </div>

          <SmartAutoFitTable
            tableId="admin_audit"
            userId={userId}
            rows={filteredAuditLogs}
            totalCount={auditLogs.length}
            getRowId={(l) => l.id}
            columns={auditColumns}
            sortKey={auditSort.key}
            sortAsc={auditSort.asc}
            onSort={(k) => setAuditSort((s) => ({ key: k, asc: s.key === k ? !s.asc : true }))}
            selectable
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectRow}
            onClearSelection={() => setSelectedIds([])}
            pinnedKeys={pinnedCols}
            onTogglePinColumn={togglePin}
            onPinAll={() => setPinnedCols(['timestamp', 'fullName'])}
            onUnpinAll={() => setPinnedCols([])}
            onResetPinDefaults={() => setPinnedCols(['fullName'])}
            onNotify={showNotice}
            emptyMessage="لا توجد سجلات تدقيق مطابقة."
          />
        </div>
      )}
    </div>
  );
}
