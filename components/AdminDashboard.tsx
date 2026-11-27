'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Building2,
  ShieldCheck,
  UserCheck,
  Search,
  KeyRound,
  Trash2,
  PlusCircle,
  Layers,
  UserPlus,
  Eye,
  X,
} from 'lucide-react';
import {
  INITIAL_USERS,
  INITIAL_BRANCHES,
  INITIAL_DEPARTMENTS,
  INITIAL_REGISTRATION_REQUESTS,
  INITIAL_AUDIT_LOGS,
  getStoredUsers,
  saveStoredUsers,
  getStoredBranches,
  getStoredDepartments,
  saveStoredDepartments,
  markDepartmentDeleted,
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
import { User, Branch, Department, RegistrationRequest, AuditLog, UserRole } from '@/types';
import AnimatedStatCard from './AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';

export default function AdminDashboard({ userId = 'default' }: { userId?: string }) {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'requests' | 'branches' | 'audit'>('users');

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [requests, setRequests] = useState<RegistrationRequest[]>(INITIAL_REGISTRATION_REQUESTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>(['fullName']);
  const [toastMsg, setToastMsg] = useState('');

  const [reqSort, setReqSort] = useState<{ key: string; asc: boolean }>({ key: 'createdAt', asc: false });
  const [userSort, setUserSort] = useState<{ key: string; asc: boolean }>({ key: 'fullName', asc: true });
  const [auditSort, setAuditSort] = useState<{ key: string; asc: boolean }>({ key: 'timestamp', asc: false });

  // نافذة إضافة مستخدم أو تعديل/إضافة كلمة مرور
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassValue, setNewPassValue] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    username: '',
    password: '',
    nationalId: '',
    phone: '01000000000',
    jobTitle: 'مفتش تمويني',
    role: 'bakery_officer' as UserRole,
    primaryBranchId: 'b-03',
  });

  // إدارة الأقسام والصلاحيات (إضافة قسم / إلغاء قسم / تخصيص للمستخدم)
  const [selectedPermUserId, setSelectedPermUserId] = useState<string>(INITIAL_USERS[1]?.id || INITIAL_USERS[0]?.id || '');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const storedUsers = getStoredUsers();
      setUsers(storedUsers);
      setBranches(getStoredBranches());
      setDepartments(getStoredDepartments());
      setRequests(getStoredRegistrationRequests());
      setAuditLogs(getStoredAuditLogs());
      if (storedUsers.length > 0) {
        setSelectedPermUserId((prev) => prev || storedUsers[0].id);
      }
    });

    let cancelled = false;
    fetch('/api/audit-logs?limit=200', { method: 'GET', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok && Array.isArray(data.logs)) {
          const serverLogs = data.logs as AuditLog[];
          const localLogs = getStoredAuditLogs();
          const seen = new Set(serverLogs.map((l) => l.id));
          const merged = [
            ...serverLogs,
            ...localLogs.filter((l) => !seen.has(l.id)),
          ];
          setAuditLogs(merged);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
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

  const handleToggleUserStatus = (targetUserId: string) => {
    const updated = users.map((u) => {
      if (u.id === targetUserId) {
        const nextStatus: 'active' | 'suspended' = u.status === 'active' ? 'suspended' : 'active';
        return { ...u, status: nextStatus };
      }
      return u;
    });
    setUsers(updated);
    saveStoredUsers(updated);
    showNotice('تم تحديث حالة حساب المستخدم');
  };

  const handleSaveUserPassword = async (targetUser: User, passwordText: string) => {
    const clean = passwordText.trim();
    if (clean.length < 4) {
      showNotice('كلمة المرور يجب ألا تقل عن ٤ أحرف.');
      return;
    }
    const updated = users.map((u) =>
      u.id === targetUser.id ? { ...u, password: clean, passwordDisabled: false } : u
    );
    setUsers(updated);
    saveStoredUsers(updated);

    try {
      await fetch('/api/auth/manage-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', username: targetUser.username, password: clean }),
      });
    } catch {
      // ignore network error; local store already updated
    }

    addAuditLog({
      userId: 'admin',
      username: 'admin',
      fullName: 'مدير النظام',
      action: 'تعديل / إضافة كلمة مرور',
      module: 'إدارة المستخدمين والصلاحيات',
      details: `تم تعيين كلمة مرور جديدة للحساب (${targetUser.username})`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'success',
    });
    setAuditLogs(getStoredAuditLogs());
    setPasswordModalUser(null);
    setNewPassValue('');
    showNotice(`تم تحديث كلمة مرور المستخدم (${targetUser.fullName}) بنجاح.`);
  };

  const handleDeleteUserPassword = async (targetUser: User) => {
    const updated = users.map((u) =>
      u.id === targetUser.id ? { ...u, password: undefined, passwordDisabled: true } : u
    );
    setUsers(updated);
    saveStoredUsers(updated);

    try {
      await fetch('/api/auth/manage-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', username: targetUser.username }),
      });
    } catch {
      // ignore network error
    }

    addAuditLog({
      userId: 'admin',
      username: 'admin',
      fullName: 'مدير النظام',
      action: 'حذف كلمة مرور مستخدم',
      module: 'إدارة المستخدمين والصلاحيات',
      details: `تم حذف كلمة مرور الحساب (${targetUser.username}) وتعطيل الدخول بها مؤقتاً`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'warning',
    });
    setAuditLogs(getStoredAuditLogs());
    showNotice(`تم حذف كلمة مرور (${targetUser.fullName}) — لن يتمكن من الدخول بكلمة مرور حتى تعيين كلمة جديدة.`);
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.fullName.trim() || !newUserForm.username.trim() || newUserForm.password.trim().length < 4) {
      showNotice('يرجى إدخال الاسم واسم المستخدم وكلمة مرور لا تقل عن ٤ أحرف.');
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === newUserForm.username.trim().toLowerCase())) {
      showNotice('اسم المستخدم مسجل مسبقاً.');
      return;
    }
    const created: User = {
      id: `usr-${Date.now()}`,
      fullName: newUserForm.fullName.trim(),
      username: newUserForm.username.trim(),
      password: newUserForm.password.trim(),
      passwordDisabled: false,
      nationalId: newUserForm.nationalId.trim() || '29001011600099',
      phone: newUserForm.phone.trim(),
      email: `${newUserForm.username.trim()}@supply.gov.eg`,
      jobTitle: newUserForm.jobTitle.trim(),
      jobGrade: 'الثالثة التخصصية',
      workplace: 'مديرية التموين بالغربية',
      branchIds: [newUserForm.primaryBranchId],
      primaryBranchId: newUserForm.primaryBranchId,
      departmentIds: departments.map((d) => d.id),
      role: newUserForm.role,
      status: 'active',
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
    };
    const updatedUsers = [created, ...users];
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    try {
      await fetch('/api/auth/manage-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', username: created.username, password: created.password }),
      });
    } catch {
      // ignore
    }

    setShowAddUserModal(false);
    setNewUserForm({
      fullName: '',
      username: '',
      password: '',
      nationalId: '',
      phone: '01000000000',
      jobTitle: 'مفتش تمويني',
      role: 'bakery_officer',
      primaryBranchId: 'b-03',
    });
    showNotice(`تم إنشاء حساب (${created.fullName}) بكلمة المرور المحددة بنجاح.`);
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    const cleanCode = (newDeptCode.trim() || `SEC_${departments.length + 1}`).toUpperCase();
    const newDept: Department = {
      id: `d-custom-${Date.now()}`,
      code: cleanCode,
      name: newDeptName.trim(),
      arabicName: newDeptName.trim(),
      description: newDeptDesc.trim() || 'قسم إداري مضاف من قائمة الصلاحيات والأقسام',
      iconName: 'Layers',
      isCore: false,
    };
    const updatedDepts = [...departments, newDept];
    setDepartments(updatedDepts);
    saveStoredDepartments(updatedDepts);

    const updatedUsers = users.map((u) =>
      u.role === 'super_admin' || u.id === selectedPermUserId
        ? { ...u, departmentIds: Array.from(new Set([...u.departmentIds, newDept.id])) }
        : u
    );
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptDesc('');
    showNotice(`تمت إضافة قسم (${newDept.arabicName}) وتفعيله في قائمة الصلاحيات والشريط الجانبي.`);
  };

  const handleRemoveDepartment = (dept: Department) => {
    if (dept.code === 'DASH' || dept.code === 'USERS' || dept.code === 'ROLES') {
      showNotice('لا يمكن إلغاء الأقسام السيادية الأساسية لإدارة النظام.');
      return;
    }
    markDepartmentDeleted(dept.id);
    const updatedDepts = departments.filter((d) => d.id !== dept.id);
    setDepartments(updatedDepts);
    saveStoredDepartments(updatedDepts);

    const updatedUsers = users.map((u) => ({
      ...u,
      departmentIds: u.departmentIds.filter((id) => id !== dept.id),
    }));
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    showNotice(`تم إلغاء وحذف قسم (${dept.arabicName}) من قائمة الصلاحيات والمنظومة.`);
  };

  const handleToggleUserDeptPerm = (targetUserId: string, deptId: string) => {
    const updated = users.map((u) => {
      if (u.id !== targetUserId) return u;
      const exists = u.departmentIds.includes(deptId);
      return {
        ...u,
        departmentIds: exists ? u.departmentIds.filter((id) => id !== deptId) : [...u.departmentIds, deptId],
      };
    });
    setUsers(updated);
    saveStoredUsers(updated);
    showNotice('تم تحديث صلاحيات الأقسام للمستخدم بنجاح.');
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
      key: 'passwordStatus',
      label: 'حالة كلمة المرور',
      headerText: 'حالة كلمة المرور',
      type: 'badge',
      align: 'center',
      defaultWidth: 135,
      render: (u) =>
        u.passwordDisabled ? (
          <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded-md text-[10px] font-black">محذوفة (معطلة)</span>
        ) : u.password ? (
          <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md text-[10px] font-black">مخصصة ومفعلة ✓</span>
        ) : (
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-black">افتراضية</span>
        ),
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      headerText: 'الإجراءات',
      type: 'actions',
      align: 'center',
      sortable: false,
      defaultWidth: 320,
      render: (u) => (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              setPasswordModalUser(u);
              setNewPassValue(u.password || '');
            }}
            className="px-2 py-1 rounded-lg bg-[#102A43] text-[#C6A15B] text-[10px] font-black cursor-pointer"
          >
            {u.password && !u.passwordDisabled ? 'تعديل كلمة المرور' : 'إضافة كلمة مرور'}
          </button>
          <button
            type="button"
            onClick={() => handleDeleteUserPassword(u)}
            className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[10px] font-black cursor-pointer"
          >
            حذف الباسورد
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedPermUserId(u.id);
              setActiveTab('permissions');
            }}
            className="px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 text-[10px] font-black cursor-pointer"
          >
            الصلاحيات
          </button>
          {u.role !== 'super_admin' && (
            <button
              type="button"
              onClick={() => handleToggleUserStatus(u.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                u.status === 'active'
                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              }`}
            >
              {u.status === 'active' ? 'إيقاف' : 'تفعيل'}
            </button>
          )}
        </div>
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
    {
      key: 'actions',
      label: 'الإجراءات',
      headerText: 'الإجراءات',
      type: 'actions',
      align: 'center',
      sortable: false,
      defaultWidth: 120,
      render: (l) => (
        <button
          type="button"
          onClick={() => showNotice(`${l.action} — ${l.details}`)}
          className="px-2.5 py-1 rounded-lg bg-[#102A43] text-[#C6A15B] text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
        >
          <Eye className="w-3 h-3" />
          <span>معاينة</span>
        </button>
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
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab('users'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            إدارة المستخدمين وكلمات المرور ({toArabicNumerals(users.length)})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('permissions'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'permissions' ? 'bg-[#102A43] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            إدارة الصلاحيات والأقسام ({toArabicNumerals(departments.length)})
          </button>

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
            <div>
              <h3 className="text-[13px] font-black text-[#102A43]">إدارة حسابات العاملين وكلمات المرور</h3>
              <span className="text-[11px] font-bold text-slate-600">
                يمكنك إضافة مستخدم جديد بكلمة مرور، أو تعديل/حذف كلمة المرور لأي حساب · الإجمالي: <span className="num-cell">{toArabicNumerals(users.length)}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم جديد + كلمة مرور</span>
            </button>
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

      {/* Tab Content: Permissions & Departments Management */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          {/* إضافة قسم جديد لقائمة الصلاحيات والمنظومة */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-3">
            <h3 className="text-[13px] font-black text-[#102A43] flex items-center gap-2 border-b border-slate-200 pb-2">
              <Layers className="w-4 h-4 text-[#C6A15B]" />
              <span>إدارة الأقسام في قائمة الصلاحيات (إضافة قسم جديد أو إلغاء قسم)</span>
            </h3>
            <form onSubmit={handleAddDepartment} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="text"
                required
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="اسم القسم الجديد *"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
              />
              <input
                type="text"
                value={newDeptCode}
                onChange={(e) => setNewDeptCode(e.target.value)}
                placeholder="رمز القسم (اختياري)"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
              />
              <input
                type="text"
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="وصف ومهام القسم"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة قسم للصلاحيات</span>
              </button>
            </form>

            {/* تخصيص أقسام المستخدم المختار */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-black text-[#102A43]">تعديل صلاحيات الأقسام للموظف:</span>
                <select
                  value={selectedPermUserId}
                  onChange={(e) => setSelectedPermUserId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 font-black text-[#102A43] bg-slate-50"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] font-bold text-slate-600">
                اضغط على «منح / إلغاء» أمام أي قسم لتعديله في صلاحيات الموظف أو حذفه نهائياً
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#102A43] text-white">
                    <th className="p-2 border border-slate-300">الكود</th>
                    <th className="p-2 border border-slate-300">اسم القسم</th>
                    <th className="p-2 border border-slate-300">الوصف</th>
                    <th className="p-2 border border-slate-300 text-center">صلاحية الموظف المحدد</th>
                    <th className="p-2 border border-slate-300 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => {
                    const targetUser = users.find((u) => u.id === selectedPermUserId);
                    const hasDept = Boolean(targetUser?.departmentIds.includes(dept.id));
                    return (
                      <tr key={dept.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                        <td className="p-2 border border-slate-200 num-cell font-black text-[#164E83]">{dept.code}</td>
                        <td className="p-2 border border-slate-200 font-black text-[#102A43]">{dept.arabicName}</td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-600">{dept.description}</td>
                        <td className="p-2 border border-slate-200 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${hasDept ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500'}`}>
                            {hasDept ? 'ممنوح ✓' : 'غير ممنوح'}
                          </span>
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {targetUser && (
                              <button
                                type="button"
                                onClick={() => handleToggleUserDeptPerm(targetUser.id, dept.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                  hasDept
                                    ? 'bg-amber-100 text-amber-950 hover:bg-amber-200'
                                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                                }`}
                              >
                                {hasDept ? 'إلغاء من الموظف' : 'منح للموظف'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveDepartment(dept)}
                              className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف القسم</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: تعديل / إضافة كلمة مرور لمستخدم */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPasswordModalUser(null)}>
          <div className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-sm font-black text-[#102A43] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#C6A15B]" />
                <span>تعيين / تعديل كلمة مرور: {passwordModalUser.fullName}</span>
              </h4>
              <button type="button" onClick={() => setPasswordModalUser(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <label className="block font-black text-[#102A43]">كلمة المرور الجديدة (٤ أحرف على الأقل)</label>
              <input
                type="text"
                value={newPassValue}
                onChange={(e) => setNewPassValue(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-black"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setPasswordModalUser(null)} className="px-3.5 py-2 rounded-xl bg-slate-200 text-[#102A43] text-xs font-black cursor-pointer">
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleSaveUserPassword(passwordModalUser, newPassValue)}
                className="px-4 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] text-xs font-black cursor-pointer"
              >
                حفظ كلمة المرور
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: إضافة مستخدم جديد بكلمة مرور */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowAddUserModal(false)}>
          <div className="bg-white rounded-2xl border-2 border-[#102A43] shadow-2xl max-w-lg w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-sm font-black text-[#102A43] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#C6A15B]" />
                <span>إضافة مستخدم جديد وتعيين كلمة المرور</span>
              </h4>
              <button type="button" onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateNewUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-black mb-1">الاسم الرباعي *</label>
                <input type="text" required value={newUserForm.fullName} onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1">اسم المستخدم *</label>
                <input type="text" required value={newUserForm.username} onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1">كلمة المرور *</label>
                <input type="text" required value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1">المسمى الوظيفي</label>
                <input type="text" value={newUserForm.jobTitle} onChange={(e) => setNewUserForm({ ...newUserForm, jobTitle: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1">الدور الوظيفي</label>
                <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black">
                  <option value="bakery_officer">مسؤول مخابز</option>
                  <option value="hr_officer">مسؤول الموارد البشرية</option>
                  <option value="internal_trade_officer">مسؤول التجارة الداخلية</option>
                  <option value="supply_admin_manager">مدير إدارة تموين</option>
                  <option value="admin">مدير نظام</option>
                </select>
              </div>
              <div>
                <label className="block font-black mb-1">الإدارة التموينية</label>
                <select value={newUserForm.primaryBranchId} onChange={(e) => setNewUserForm({ ...newUserForm, primaryBranchId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black">
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.arabicName}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 rounded-xl bg-slate-200 text-[#102A43] font-black cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#102A43] text-[#C6A15B] font-black cursor-pointer">حفظ وإنشاء المستخدم</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
