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
  EyeOff,
  Pencil,
  Sparkles,
  CheckCircle2,
  Ban,
  RefreshCw,
  AlertTriangle,
  SlidersHorizontal,
  X,
  Database,
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
  getCurrentSessionUser,
  setCurrentSessionUser,
} from '@/lib/mock-db';
import {
  formatDateArabic,
  toArabicNumerals,
  getRoleArabicLabel,
  normalizeSearchText,
} from '@/lib/utils';
import { User, Branch, Department, RegistrationRequest, AuditLog, UserRole, EmployeeStatus } from '@/types';
import AnimatedStatCard from './AnimatedStatCard';
import SmartAutoFitTable, { SmartTableColumn } from './SmartAutoFitTable';

type UserFilterChip = 'all' | 'managers' | 'officers' | 'inspectors' | 'suspended' | 'no_custom_password';

const ROLE_OPTIONS: { value: UserRole; label: string; defaultDeptCodes: string[] }[] = [
  { value: 'super_admin', label: 'مدير النظام الأعلى', defaultDeptCodes: ['*'] },
  { value: 'admin', label: 'مدير نظام', defaultDeptCodes: ['*'] },
  { value: 'directorate_manager', label: 'مدير المديرية', defaultDeptCodes: ['*'] },
  { value: 'supply_admin_manager', label: 'مدير إدارة تموين', defaultDeptCodes: ['DASH', 'BAK', 'DEBTS', 'LISTS', 'TASKS', 'TRADE', 'COMM', 'GRAIN', 'HR', 'COMP'] },
  { value: 'department_manager', label: 'مدير قسم', defaultDeptCodes: ['DASH', 'BAK', 'DEBTS', 'LISTS', 'TASKS', 'TRADE', 'COMP'] },
  { value: 'bakery_officer', label: 'مسؤول مخابز', defaultDeptCodes: ['DASH', 'BAK', 'DEBTS', 'LISTS', 'TASKS'] },
  { value: 'debts_officer', label: 'مسؤول المديونيات والتحصيل', defaultDeptCodes: ['DASH', 'BAK', 'DEBTS', 'TASKS'] },
  { value: 'internal_trade_officer', label: 'مسؤول التجارة الداخلية', defaultDeptCodes: ['DASH', 'TRADE', 'TASKS', 'COMP'] },
  { value: 'commodities_officer', label: 'مسؤول السلع التموينية', defaultDeptCodes: ['DASH', 'COMM', 'TASKS'] },
  { value: 'grain_officer', label: 'مسؤول صيانة الحبوب والصوامع', defaultDeptCodes: ['DASH', 'GRAIN', 'TASKS'] },
  { value: 'hr_officer', label: 'مسؤول الموارد البشرية', defaultDeptCodes: ['DASH', 'HR', 'TASKS'] },
  { value: 'supply_inspector', label: 'مفتش تمويني', defaultDeptCodes: ['DASH', 'BAK', 'TRADE', 'TASKS', 'COMP'] },
  { value: 'control_inspector', label: 'مفتش رقابة تموينية', defaultDeptCodes: ['DASH', 'BAK', 'TRADE', 'COMM', 'TASKS'] },
  { value: 'reviewer', label: 'مراجع إداري', defaultDeptCodes: ['DASH', 'BAK', 'DEBTS', 'TASKS'] },
  { value: 'data_entry', label: 'مدخل بيانات', defaultDeptCodes: ['DASH', 'BAK', 'TASKS'] },
  { value: 'viewer', label: 'عرض ومتابعة فقط', defaultDeptCodes: ['DASH', 'TASKS'] },
];

function getPresetDeptIds(role: UserRole, depts: Department[]): string[] {
  const preset = ROLE_OPTIONS.find((r) => r.value === role);
  if (!preset || preset.defaultDeptCodes.includes('*')) {
    return depts.map((d) => d.id);
  }
  const codeSet = new Set(preset.defaultDeptCodes);
  const matched = depts.filter((d) => codeSet.has(d.code)).map((d) => d.id);
  return matched.length > 0 ? matched : depts.slice(0, 3).map((d) => d.id);
}

function generateStrongPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#';
  let out = 'Gh@';
  for (let i = 0; i < 7; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function getPasswordStrength(pw: string): { label: string; score: number; color: string } {
  const clean = pw.trim();
  if (!clean) return { label: 'غير محددة', score: 0, color: 'bg-slate-300' };
  let score = 1;
  if (clean.length >= 6) score++;
  if (clean.length >= 10) score++;
  if (/[A-Z]/.test(clean) && /[0-9]/.test(clean)) score++;
  if (/[^A-Za-z0-9]/.test(clean)) score++;
  if (score <= 2) return { label: 'ضعيفة', score: 35, color: 'bg-red-500' };
  if (score === 3) return { label: 'متوسطة', score: 65, color: 'bg-amber-500' };
  return { label: 'قوية ومؤمنة', score: 100, color: 'bg-emerald-600' };
}

function getStatusBadge(status: EmployeeStatus) {
  switch (status) {
    case 'active':
      return <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full text-[10px] font-black">نشط</span>;
    case 'suspended':
      return <span className="bg-red-100 text-red-900 px-2.5 py-0.5 rounded-full text-[10px] font-black">موقوف</span>;
    case 'leave':
      return <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full text-[10px] font-black">في إجازة</span>;
    case 'seconded':
      return <span className="bg-sky-100 text-sky-900 px-2.5 py-0.5 rounded-full text-[10px] font-black">إعارة / مأمورية</span>;
    default:
      return <span className="bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-full text-[10px] font-black">غير نشط</span>;
  }
}

export default function AdminDashboard({ userId = 'default' }: { userId?: string }) {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'requests' | 'branches' | 'audit'>('users');

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [requests, setRequests] = useState<RegistrationRequest[]>(INITIAL_REGISTRATION_REQUESTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const [searchTerm, setSearchTerm] = useState('');
  const [userFilterChip, setUserFilterChip] = useState<UserFilterChip>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedCols, setPinnedCols] = useState<string[]>(['fullName']);
  const [toastMsg, setToastMsg] = useState('');
  const [dbEngineLabel, setDbEngineLabel] = useState('قاعدة بيانات SQLite المدمجة');
  const [isDbBusy, setIsDbBusy] = useState(false);

  const [reqSort, setReqSort] = useState<{ key: string; asc: boolean }>({ key: 'createdAt', asc: false });
  const [userSort, setUserSort] = useState<{ key: string; asc: boolean }>({ key: 'fullName', asc: true });
  const [auditSort, setAuditSort] = useState<{ key: string; asc: boolean }>({ key: 'timestamp', asc: false });

  // Password modal
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassValue, setNewPassValue] = useState('');
  const [showPassField, setShowPassField] = useState(true);

  // Add user modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(true);
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    username: '',
    password: '',
    nationalId: '',
    phone: '01000000000',
    email: '',
    jobTitle: 'مفتش تمويني',
    jobGrade: 'الثالثة التخصصية',
    workplace: 'مديرية التموين بالغربية',
    role: 'bakery_officer' as UserRole,
    primaryBranchId: 'b-03',
    departmentIds: [] as string[],
  });

  // Smart Edit User modal
  const [editModalUser, setEditModalUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    username: '',
    nationalId: '',
    phone: '',
    email: '',
    jobTitle: '',
    jobGrade: '',
    workplace: '',
    role: 'bakery_officer' as UserRole,
    status: 'active' as EmployeeStatus,
    primaryBranchId: 'b-03',
    departmentIds: [] as string[],
    newPassword: '',
  });
  const [showEditPass, setShowEditPass] = useState(false);

  // Quick Preview modal
  const [previewUser, setPreviewUser] = useState<User | null>(null);

  // Single Delete & Bulk Confirm modals
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'delete' | 'activate' | 'suspend' | null>(null);

  // Departments & permissions state
  const [selectedPermUserId, setSelectedPermUserId] = useState<string>(INITIAL_USERS[1]?.id || INITIAL_USERS[0]?.id || '');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const refreshUsersFromDb = async () => {
    setIsDbBusy(true);
    try {
      const res = await fetch('/api/users', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          users?: User[];
          dbInfo?: { labelAr?: string };
        };
        if (data.ok && Array.isArray(data.users)) {
          setUsers(data.users);
          saveStoredUsers(data.users);
          if (data.dbInfo?.labelAr) setDbEngineLabel(data.dbInfo.labelAr);
          if (data.users.length > 0) {
            setSelectedPermUserId((prev) =>
              data.users!.some((u) => u.id === prev) ? prev : data.users![0].id
            );
          }
          setIsDbBusy(false);
          return;
        }
      }
    } catch {
      // fallback to local cache if unauthenticated or offline
    }
    setIsDbBusy(false);
  };

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const storedUsers = getStoredUsers();
      const storedDepts = getStoredDepartments();
      setUsers(storedUsers);
      setBranches(getStoredBranches());
      setDepartments(storedDepts);
      setRequests(getStoredRegistrationRequests());
      setAuditLogs(getStoredAuditLogs());
      if (storedUsers.length > 0) {
        setSelectedPermUserId((prev) => prev || storedUsers[0].id);
      }
      setNewUserForm((prev) => ({
        ...prev,
        departmentIds: getPresetDeptIds(prev.role, storedDepts),
      }));
    });

    let cancelled = false;
    fetch('/api/users', { method: 'GET', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok && Array.isArray(data.users)) {
          const dbUsers = data.users as User[];
          setUsers(dbUsers);
          saveStoredUsers(dbUsers);
          if (data.dbInfo?.labelAr) setDbEngineLabel(data.dbInfo.labelAr);
          if (dbUsers.length > 0) {
            setSelectedPermUserId((prev) =>
              dbUsers.some((u) => u.id === prev) ? prev : dbUsers[0].id
            );
          }
        }
      })
      .catch(() => {});

    fetch('/api/audit-logs?limit=200', { method: 'GET', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok && Array.isArray(data.logs)) {
          const serverLogs = data.logs as AuditLog[];
          const localLogs = getStoredAuditLogs();
          const seen = new Set(serverLogs.map((l) => l.id));
          setAuditLogs([...serverLogs, ...localLogs.filter((l) => !seen.has(l.id))]);
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
    setTimeout(() => setToastMsg(''), 3400);
  };

  const syncSessionIfSelf = (updatedUser: User) => {
    const activeSession = getCurrentSessionUser();
    if (activeSession && (activeSession.id === updatedUser.id || updatedUser.id === userId)) {
      setCurrentSessionUser(updatedUser);
    }
    window.dispatchEvent(new CustomEvent('gharbia-departments-updated'));
  };

  const normQuery = normalizeSearchText(searchTerm);

  const superAdminCount = useMemo(
    () => users.filter((u) => u.role === 'super_admin').length,
    [users]
  );

  const isProtectedUser = (u: User) =>
    u.id === userId || (u.role === 'super_admin' && superAdminCount <= 1);

  const filteredRequests = useMemo(() => {
    return normQuery
      ? requests.filter((r) =>
          normalizeSearchText(`${r.fullName} ${r.username} ${r.nationalId} ${r.jobTitle} ${getRoleArabicLabel(r.requestedRole)}`).includes(normQuery)
        )
      : requests;
  }, [requests, normQuery]);

  const filteredUsers = useMemo(() => {
    let base = users;
    if (userFilterChip === 'managers') {
      base = base.filter((u) =>
        ['super_admin', 'admin', 'directorate_manager', 'deputy_directorate', 'supply_admin_manager', 'department_manager', 'section_head'].includes(u.role)
      );
    } else if (userFilterChip === 'officers') {
      base = base.filter((u) =>
        ['bakery_officer', 'debts_officer', 'internal_trade_officer', 'commodities_officer', 'grain_officer', 'hr_officer'].includes(u.role)
      );
    } else if (userFilterChip === 'inspectors') {
      base = base.filter((u) => ['supply_inspector', 'control_inspector', 'reviewer'].includes(u.role));
    } else if (userFilterChip === 'suspended') {
      base = base.filter((u) => u.status !== 'active');
    } else if (userFilterChip === 'no_custom_password') {
      base = base.filter((u) => !(u.hasCustomPassword || u.password) || u.passwordDisabled);
    }

    return normQuery
      ? base.filter((u) =>
          normalizeSearchText(`${u.fullName} ${u.username} ${u.nationalId} ${u.phone} ${u.jobTitle} ${getRoleArabicLabel(u.role)}`).includes(normQuery)
        )
      : base;
  }, [users, userFilterChip, normQuery]);

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

  const handleApproveRequest = async (req: RegistrationRequest) => {
    const deptIds =
      req.requestedDepartments.length > 0
        ? req.requestedDepartments
        : getPresetDeptIds(req.requestedRole, departments);

    let createdUser: User = {
      id: `usr-${Date.now()}`,
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
      departmentIds: deptIds,
      role: req.requestedRole,
      status: 'active',
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: req.fullName,
          username: req.username,
          password: req.tempPassword || 'Gh@123456',
          nationalId: req.nationalId,
          phone: req.phone,
          email: req.email || `${req.username}@supply.gov.eg`,
          jobTitle: req.jobTitle,
          jobGrade: req.jobGrade,
          workplace: req.workplace,
          primaryBranchId: req.primaryBranchId,
          branchIds: req.branchIds,
          departmentIds: deptIds,
          role: req.requestedRole,
          status: 'active',
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { ok?: boolean; user?: User };
        if (data.ok && data.user) createdUser = data.user;
      }
    } catch {
      // fallback to local list update
    }

    const updatedUsers = [createdUser, ...users.filter((u) => u.id !== createdUser.id)];
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    const updatedReqs = requests.map((r) =>
      r.id === req.id ? { ...r, status: 'approved' as const, reviewedAt: new Date().toISOString() } : r
    );
    setRequests(updatedReqs);
    saveStoredRegistrationRequests(updatedReqs);

    addAuditLog({
      userId: userId,
      username: 'admin',
      fullName: 'مدير النظام',
      action: 'اعتماد مستخدم جديد',
      module: 'إدارة المستخدمين',
      branchId: req.primaryBranchId,
      details: `تم اعتماد المستخدم (${req.fullName}) بدور (${getRoleArabicLabel(req.requestedRole)}) بقاعدة البيانات`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'success',
    });
    setAuditLogs(getStoredAuditLogs());
    showNotice(`تم اعتماد وتفعيل حساب ${req.fullName} وحفظه في قاعدة البيانات.`);
  };

  const handleRejectRequest = (reqId: string) => {
    const updatedReqs = requests.map((r) =>
      r.id === reqId ? { ...r, status: 'rejected' as const, reviewedAt: new Date().toISOString() } : r
    );
    setRequests(updatedReqs);
    saveStoredRegistrationRequests(updatedReqs);
    showNotice('تم رفض طلب التسجيل.');
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    if (isProtectedUser(targetUser) && targetUser.status === 'active') {
      showNotice('لا يمكن إيقاف حسابك الحالي أو آخر مدير أعلى بالمنظومة.');
      return;
    }
    const nextStatus: EmployeeStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetUser.id, status: nextStatus }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 400 || res.status === 403) {
          showNotice(err.error || 'تعذر تحديث حالة الحساب.');
          return;
        }
      }
    } catch {
      // continue local update
    }

    const updated = users.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u));
    setUsers(updated);
    saveStoredUsers(updated);
    addAuditLog({
      userId,
      username: targetUser.username,
      fullName: 'مدير النظام',
      action: nextStatus === 'active' ? 'تفعيل حساب مستخدم' : 'إيقاف حساب مستخدم',
      module: 'إدارة المستخدمين والصلاحيات',
      details: `تم تغيير حالة الحساب (${targetUser.fullName}) إلى (${nextStatus === 'active' ? 'نشط' : 'موقوف'})`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'success',
    });
    setAuditLogs(getStoredAuditLogs());
    showNotice(`تم ${nextStatus === 'active' ? 'تفعيل' : 'إيقاف'} حساب ${targetUser.fullName} بقاعدة البيانات.`);
  };

  const handleSaveUserPassword = async (targetUser: User, passwordText: string) => {
    const clean = passwordText.trim();
    if (clean.length < 4) {
      showNotice('كلمة المرور يجب ألا تقل عن ٤ أحرف.');
      return;
    }

    setIsDbBusy(true);
    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetUser.id, password: clean, passwordAction: 'set' }),
      });
      await fetch('/api/auth/manage-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', username: targetUser.username, password: clean }),
      });
    } catch {
      // ignore network fallback
    }
    setIsDbBusy(false);

    const updated = users.map((u) =>
      u.id === targetUser.id
        ? { ...u, passwordDisabled: false, hasCustomPassword: true }
        : u
    );
    setUsers(updated);
    saveStoredUsers(updated);
    const updatedSelf = updated.find((u) => u.id === targetUser.id);
    if (updatedSelf) syncSessionIfSelf(updatedSelf);

    addAuditLog({
      userId,
      username: 'admin',
      fullName: 'مدير النظام',
      action: 'تعديل / إضافة كلمة مرور',
      module: 'إدارة المستخدمين والصلاحيات',
      details: `تم تحديث كلمة مرور الحساب (${targetUser.username}) وتشفيرها بقاعدة البيانات`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'success',
    });
    setAuditLogs(getStoredAuditLogs());
    setPasswordModalUser(null);
    setNewPassValue('');
    showNotice(`تم حفظ كلمة مرور (${targetUser.fullName}) مشفرة في قاعدة البيانات بنجاح.`);
  };

  const handleDeleteUserPassword = async (targetUser: User) => {
    setIsDbBusy(true);
    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetUser.id, passwordAction: 'delete' }),
      });
      await fetch('/api/auth/manage-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', username: targetUser.username }),
      });
    } catch {
      // ignore network error
    }
    setIsDbBusy(false);

    const updated = users.map((u) =>
      u.id === targetUser.id
        ? { ...u, password: undefined, hasCustomPassword: false, passwordDisabled: true }
        : u
    );
    setUsers(updated);
    saveStoredUsers(updated);

    addAuditLog({
      userId,
      username: 'admin',
      fullName: 'مدير النظام',
      action: 'حذف كلمة مرور مستخدم',
      module: 'إدارة المستخدمين والصلاحيات',
      details: `تم حذف كلمة مرور الحساب (${targetUser.username}) وتعطيل الدخول بها بقاعدة البيانات`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'warning',
    });
    setAuditLogs(getStoredAuditLogs());
    showNotice(`تم حذف كلمة مرور (${targetUser.fullName}) من قاعدة البيانات بنجاح.`);
  };

  const openAddUserModal = () => {
    setNewUserForm({
      fullName: '',
      username: '',
      password: generateStrongPassword(),
      nationalId: '',
      phone: '01000000000',
      email: '',
      jobTitle: 'مفتش تمويني',
      jobGrade: 'الثالثة التخصصية',
      workplace: 'مديرية التموين بالغربية',
      role: 'bakery_officer',
      primaryBranchId: branches[0]?.id || 'b-03',
      departmentIds: getPresetDeptIds('bakery_officer', departments),
    });
    setShowAddPassword(true);
    setShowAddUserModal(true);
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUserForm.username.trim();
    const cleanPassword = newUserForm.password.trim();
    if (!newUserForm.fullName.trim() || !cleanUsername || cleanPassword.length < 4) {
      showNotice('يرجى إدخال الاسم الرباعي واسم المستخدم وكلمة مرور لا تقل عن ٤ أحرف.');
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      showNotice('اسم المستخدم مسجل مسبقاً. اختر اسم مستخدم مختلفاً.');
      return;
    }

    const deptIds =
      newUserForm.departmentIds.length > 0
        ? newUserForm.departmentIds
        : getPresetDeptIds(newUserForm.role, departments);

    setIsDbBusy(true);
    let created: User = {
      id: `usr-${Date.now()}`,
      fullName: newUserForm.fullName.trim(),
      username: cleanUsername,
      hasCustomPassword: true,
      passwordDisabled: false,
      nationalId: newUserForm.nationalId.trim() || '29001011600099',
      phone: newUserForm.phone.trim() || '01000000000',
      email: newUserForm.email.trim() || `${cleanUsername}@supply.gov.eg`,
      jobTitle: newUserForm.jobTitle.trim() || getRoleArabicLabel(newUserForm.role),
      jobGrade: newUserForm.jobGrade.trim() || 'الثالثة التخصصية',
      workplace: newUserForm.workplace.trim() || 'مديرية التموين بالغربية',
      branchIds: [newUserForm.primaryBranchId],
      primaryBranchId: newUserForm.primaryBranchId,
      departmentIds: deptIds,
      role: newUserForm.role,
      status: 'active',
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: created.fullName,
          username: created.username,
          password: cleanPassword,
          nationalId: created.nationalId,
          phone: created.phone,
          email: created.email,
          jobTitle: created.jobTitle,
          jobGrade: created.jobGrade,
          workplace: created.workplace,
          primaryBranchId: created.primaryBranchId,
          branchIds: created.branchIds,
          departmentIds: created.departmentIds,
          role: created.role,
          status: 'active',
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        user?: User;
      };
      if (!res.ok) {
        setIsDbBusy(false);
        showNotice(payload.error || 'تعذر إنشاء المستخدم في قاعدة البيانات.');
        return;
      }
      if (payload.ok && payload.user) {
        created = payload.user;
      }
    } catch {
      // offline fallback
    }
    setIsDbBusy(false);

    const updatedUsers = [created, ...users];
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    window.dispatchEvent(new CustomEvent('gharbia-departments-updated'));

    addAuditLog({
      userId,
      username: created.username,
      fullName: 'مدير النظام',
      action: 'إضافة مستخدم جديد بقاعدة البيانات',
      module: 'إدارة المستخدمين والصلاحيات',
      branchId: created.primaryBranchId,
      details: `تم إنشاء حساب (${created.fullName}) بدور (${getRoleArabicLabel(created.role)}) مع ${created.departmentIds.length} قسماً`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'success',
    });
    setAuditLogs(getStoredAuditLogs());
    setShowAddUserModal(false);
    showNotice(`تم إنشاء حساب (${created.fullName}) وحفظه في قاعدة البيانات بنجاح.`);
  };

  const openEditUserModal = (u: User) => {
    setEditModalUser(u);
    setEditForm({
      fullName: u.fullName,
      username: u.username,
      nationalId: u.nationalId,
      phone: u.phone,
      email: u.email,
      jobTitle: u.jobTitle,
      jobGrade: u.jobGrade,
      workplace: u.workplace,
      role: u.role,
      status: u.status,
      primaryBranchId: u.primaryBranchId,
      departmentIds: [...u.departmentIds],
      newPassword: '',
    });
    setShowEditPass(false);
  };

  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;
    const cleanUsername = editForm.username.trim();
    if (!editForm.fullName.trim() || !cleanUsername) {
      showNotice('يرجى التأكد من إدخال الاسم الرباعي واسم المستخدم.');
      return;
    }
    if (
      users.some(
        (u) => u.id !== editModalUser.id && u.username.toLowerCase() === cleanUsername.toLowerCase()
      )
    ) {
      showNotice('اسم المستخدم مستخدم بالفعل لحساب آخر.');
      return;
    }
    const newPass = editForm.newPassword.trim();
    if (newPass && newPass.length < 4) {
      showNotice('كلمة المرور الجديدة يجب ألا تقل عن ٤ أحرف.');
      return;
    }

    setIsDbBusy(true);
    let updatedUser: User = {
      ...editModalUser,
      fullName: editForm.fullName.trim(),
      username: cleanUsername,
      nationalId: editForm.nationalId.trim() || editModalUser.nationalId,
      phone: editForm.phone.trim() || editModalUser.phone,
      email: editForm.email.trim() || editModalUser.email,
      jobTitle: editForm.jobTitle.trim() || getRoleArabicLabel(editForm.role),
      jobGrade: editForm.jobGrade.trim() || editModalUser.jobGrade,
      workplace: editForm.workplace.trim() || editModalUser.workplace,
      role: editForm.role,
      status: editForm.status,
      primaryBranchId: editForm.primaryBranchId,
      branchIds: Array.from(new Set([editForm.primaryBranchId, ...editModalUser.branchIds])),
      departmentIds: editForm.departmentIds,
      ...(newPass ? { hasCustomPassword: true, passwordDisabled: false } : {}),
    };

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editModalUser.id,
          fullName: updatedUser.fullName,
          username: updatedUser.username,
          nationalId: updatedUser.nationalId,
          phone: updatedUser.phone,
          email: updatedUser.email,
          jobTitle: updatedUser.jobTitle,
          jobGrade: updatedUser.jobGrade,
          workplace: updatedUser.workplace,
          role: updatedUser.role,
          status: updatedUser.status,
          primaryBranchId: updatedUser.primaryBranchId,
          branchIds: updatedUser.branchIds,
          departmentIds: updatedUser.departmentIds,
          ...(newPass ? { password: newPass, passwordAction: 'set' } : {}),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        user?: User;
      };
      if (!res.ok) {
        setIsDbBusy(false);
        showNotice(payload.error || 'تعذر حفظ التعديلات بقاعدة البيانات.');
        return;
      }
      if (payload.ok && payload.user) {
        updatedUser = payload.user;
      }
    } catch {
      // fallback
    }
    setIsDbBusy(false);

    const updatedUsers = users.map((u) => (u.id === editModalUser.id ? updatedUser : u));
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    syncSessionIfSelf(updatedUser);

    addAuditLog({
      userId,
      username: updatedUser.username,
      fullName: 'مدير النظام',
      action: 'تعديل بيانات وصلاحيات مستخدم بقاعدة البيانات',
      module: 'إدارة المستخدمين والصلاحيات',
      branchId: updatedUser.primaryBranchId,
      details: `تم تعديل حساب (${updatedUser.fullName}) — الدور: ${getRoleArabicLabel(updatedUser.role)} — الأقسام: ${updatedUser.departmentIds.length}`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'success',
    });
    setAuditLogs(getStoredAuditLogs());
    setEditModalUser(null);
    showNotice(`تم حفظ كافة التعديلات على حساب (${updatedUser.fullName}) في قاعدة البيانات بنجاح.`);
  };

  const handleConfirmDeleteSingleUser = async () => {
    if (!deleteTargetUser) return;
    if (isProtectedUser(deleteTargetUser)) {
      showNotice('لا يمكن حذف الحساب النشط حالياً أو آخر مدير نظام أعلى.');
      setDeleteTargetUser(null);
      return;
    }

    setIsDbBusy(true);
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(deleteTargetUser.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status === 400) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setIsDbBusy(false);
        showNotice(err.error || 'تعذر حذف المستخدم.');
        setDeleteTargetUser(null);
        return;
      }
    } catch {
      // fallback
    }
    setIsDbBusy(false);

    const updatedUsers = users.filter((u) => u.id !== deleteTargetUser.id);
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    setSelectedIds((prev) => prev.filter((id) => id !== deleteTargetUser.id));
    if (selectedPermUserId === deleteTargetUser.id && updatedUsers[0]) {
      setSelectedPermUserId(updatedUsers[0].id);
    }
    window.dispatchEvent(new CustomEvent('gharbia-departments-updated'));

    addAuditLog({
      userId,
      username: deleteTargetUser.username,
      fullName: 'مدير النظام',
      action: 'حذف مستخدم نهائياً من قاعدة البيانات',
      module: 'إدارة المستخدمين والصلاحيات',
      details: `تم حذف حساب المستخدم (${deleteTargetUser.fullName} — ${deleteTargetUser.username}) نهائياً`,
      ipAddress: '192.168.1.50',
      deviceInfo: 'متصفح الويب المعتمد',
      status: 'warning',
    });
    setAuditLogs(getStoredAuditLogs());
    showNotice(`تم حذف المستخدم (${deleteTargetUser.fullName}) نهائياً من قاعدة البيانات.`);
    setDeleteTargetUser(null);
  };

  const handleExecuteBulkAction = async () => {
    if (!bulkConfirmAction || selectedIds.length === 0) return;
    const selectedUsers = users.filter((u) => selectedIds.includes(u.id));
    const actionable = selectedUsers.filter((u) => !isProtectedUser(u));
    const skippedCount = selectedUsers.length - actionable.length;

    if (actionable.length === 0) {
      showNotice('المستخدمون المحددون محميون (الحساب النشط أو آخر مدير أعلى).');
      setBulkConfirmAction(null);
      return;
    }

    const actionableIds = new Set(actionable.map((u) => u.id));
    setIsDbBusy(true);
    if (bulkConfirmAction === 'delete') {
      try {
        await fetch('/api/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(actionableIds) }),
        });
      } catch {
        // ignore
      }
      const remaining = users.filter((u) => !actionableIds.has(u.id));
      setUsers(remaining);
      saveStoredUsers(remaining);
      addAuditLog({
        userId,
        username: 'admin',
        fullName: 'مدير النظام',
        action: 'حذف جماعي للمستخدمين',
        module: 'إدارة المستخدمين والصلاحيات',
        details: `تم حذف عدد (${actionable.length}) مستخدم من قاعدة البيانات`,
        ipAddress: '192.168.1.50',
        deviceInfo: 'متصفح الويب المعتمد',
        status: 'warning',
      });
      showNotice(
        `تم حذف ${toArabicNumerals(actionable.length)} مستخدماً من قاعدة البيانات${skippedCount > 0 ? ` (مع حماية ${toArabicNumerals(skippedCount)} حساب أساسي)` : ''}.`
      );
    } else {
      const nextStatus: EmployeeStatus = bulkConfirmAction === 'activate' ? 'active' : 'suspended';
      for (const target of actionable) {
        try {
          await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: target.id, status: nextStatus }),
          });
        } catch {
          // ignore
        }
      }
      const updated = users.map((u) => (actionableIds.has(u.id) ? { ...u, status: nextStatus } : u));
      setUsers(updated);
      saveStoredUsers(updated);
      addAuditLog({
        userId,
        username: 'admin',
        fullName: 'مدير النظام',
        action: nextStatus === 'active' ? 'تفعيل جماعي للحسابات' : 'إيقاف جماعي للحسابات',
        module: 'إدارة المستخدمين والصلاحيات',
        details: `تم تحديث حالة عدد (${actionable.length}) حساب إلى ${nextStatus === 'active' ? 'نشط' : 'موقوف'}`,
        ipAddress: '192.168.1.50',
        deviceInfo: 'متصفح الويب المعتمد',
        status: 'success',
      });
      showNotice(`تم ${nextStatus === 'active' ? 'تفعيل' : 'إيقاف'} ${toArabicNumerals(actionable.length)} حساباً بقاعدة البيانات بنجاح.`);
    }
    setIsDbBusy(false);

    window.dispatchEvent(new CustomEvent('gharbia-departments-updated'));
    setAuditLogs(getStoredAuditLogs());
    setSelectedIds([]);
    setBulkConfirmAction(null);
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
    window.dispatchEvent(new CustomEvent('gharbia-departments-updated'));

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
    window.dispatchEvent(new CustomEvent('gharbia-departments-updated'));
    showNotice(`تم إلغاء وحذف قسم (${dept.arabicName}) من قائمة الصلاحيات والمنظومة.`);
  };

  const handleToggleUserDeptPerm = async (targetUserId: string, deptId: string) => {
    const target = users.find((u) => u.id === targetUserId);
    if (!target) return;
    const exists = target.departmentIds.includes(deptId);
    const nextDepts = exists
      ? target.departmentIds.filter((id) => id !== deptId)
      : [...target.departmentIds, deptId];

    const updated = users.map((u) => (u.id === targetUserId ? { ...u, departmentIds: nextDepts } : u));
    setUsers(updated);
    saveStoredUsers(updated);
    const selfUpdated = updated.find((u) => u.id === targetUserId);
    if (selfUpdated) syncSessionIfSelf(selfUpdated);

    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetUserId, departmentIds: nextDepts }),
      });
    } catch {
      // ignore
    }
    showNotice('تم تحديث صلاحيات الأقسام للمستخدم وحفظها بقاعدة البيانات.');
  };

  const handleApplyPermTemplateToSelected = async (mode: 'preset' | 'all' | 'minimal') => {
    const target = users.find((u) => u.id === selectedPermUserId);
    if (!target) return;
    let nextDeptIds: string[] = [];
    if (mode === 'all') {
      nextDeptIds = departments.map((d) => d.id);
    } else if (mode === 'minimal') {
      nextDeptIds = departments.filter((d) => d.code === 'DASH' || d.code === 'TASKS').map((d) => d.id);
    } else {
      nextDeptIds = getPresetDeptIds(target.role, departments);
    }
    const updatedUser = { ...target, departmentIds: nextDeptIds };
    const updated = users.map((u) => (u.id === target.id ? updatedUser : u));
    setUsers(updated);
    saveStoredUsers(updated);
    syncSessionIfSelf(updatedUser);

    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, departmentIds: nextDeptIds }),
      });
    } catch {
      // ignore
    }

    showNotice(
      mode === 'all'
        ? `تم منح جميع الأقسام (${toArabicNumerals(nextDeptIds.length)}) للموظف ${target.fullName} بقاعدة البيانات.`
        : mode === 'minimal'
        ? `تم قصر صلاحيات ${target.fullName} على لوحة القيادة والمهام فقط.`
        : `تم تطبيق قالب الدور (${getRoleArabicLabel(target.role)}) للموظف ${target.fullName} بقاعدة البيانات.`
    );
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
      render: (req) => <span className="font-extrabold text-[#1E3346]">{req.fullName}</span>,
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
      render: (req) => <span className="font-extrabold text-[#2B6270]">{getRoleArabicLabel(req.requestedRole)}</span>,
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
          {req.status === 'pending' && <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">قيد المراجعة</span>}
          {req.status === 'approved' && <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">تم الاعتماد</span>}
          {req.status === 'rejected' && <span className="bg-red-100 text-red-900 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">مرفوض</span>}
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
      defaultWidth: 205,
      render: (u) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2B485E] to-[#3B717E] text-white flex items-center justify-center text-[10px] font-black shrink-0">
            {u.fullName.charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="font-black text-[#1E3346] block truncate">{u.fullName}</span>
            <span className="text-[10px] font-bold text-slate-500 block truncate">{u.jobTitle}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'username',
      label: 'اسم المستخدم',
      headerText: 'اسم المستخدم',
      type: 'text',
      defaultWidth: 130,
      render: (u) => <span className="font-mono text-slate-700 font-bold">{u.username}</span>,
    },
    {
      key: 'role',
      label: 'الدور الوظيفي',
      headerText: 'الدور الوظيفي',
      type: 'badge',
      defaultWidth: 155,
      sortValue: (u) => getRoleArabicLabel(u.role),
      measureValue: (u) => getRoleArabicLabel(u.role),
      render: (u) => <span className="font-extrabold text-[#2B6270]">{getRoleArabicLabel(u.role)}</span>,
    },
    {
      key: 'departmentsCount',
      label: 'الأقسام المفعلة',
      headerText: 'الأقسام المفعلة',
      type: 'numeric',
      align: 'center',
      defaultWidth: 120,
      sortValue: (u) => u.departmentIds.length,
      measureValue: (u) => `${toArabicNumerals(u.departmentIds.length)} قسم`,
      render: (u) => (
        <button
          type="button"
          onClick={() => {
            setSelectedPermUserId(u.id);
            setActiveTab('permissions');
          }}
          className="px-2.5 py-0.5 rounded-full bg-[#DCECEF] text-[#1E3346] text-[10px] font-black hover:bg-[#C3E0E5] cursor-pointer"
        >
          {toArabicNumerals(u.departmentIds.length)} / {toArabicNumerals(departments.length)}
        </button>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      headerText: 'الحالة',
      type: 'badge',
      align: 'center',
      defaultWidth: 100,
      render: (u) => getStatusBadge(u.status),
    },
    {
      key: 'passwordStatus',
      label: 'كلمة المرور',
      headerText: 'كلمة المرور',
      type: 'badge',
      align: 'center',
      defaultWidth: 130,
      render: (u) =>
        u.passwordDisabled ? (
          <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded-full text-[10px] font-black">محذوفة</span>
        ) : u.hasCustomPassword || u.password ? (
          <span className="bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full text-[10px] font-black">مخصصة ✓</span>
        ) : (
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-black">افتراضية</span>
        ),
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      headerText: 'الإجراءات',
      type: 'actions',
      align: 'center',
      sortable: false,
      defaultWidth: 380,
      render: (u) => (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => setPreviewUser(u)}
            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#1E3346] text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
            title="معاينة الملف"
          >
            <Eye className="w-3 h-3" />
            <span>معاينة</span>
          </button>
          <button
            type="button"
            onClick={() => openEditUserModal(u)}
            className="px-2 py-1 rounded-lg bg-[#253B4F] hover:bg-[#32516D] text-white text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
            title="تعديل بيانات المستخدم والصلاحيات"
          >
            <Pencil className="w-3 h-3 text-[#94C9CE]" />
            <span>تعديل</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPasswordModalUser(u);
              setNewPassValue('');
              setShowPassField(true);
            }}
            className="px-2 py-1 rounded-lg bg-[#DCECEF] hover:bg-[#C3E0E5] text-[#1E3346] text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
          >
            <KeyRound className="w-3 h-3" />
            <span>{(u.hasCustomPassword || u.password) && !u.passwordDisabled ? 'تعديل الباسورد' : 'تعيين باسورد'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleDeleteUserPassword(u)}
            className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[10px] font-black cursor-pointer"
            title="تعطيل كلمة المرور"
          >
            حذف الباسورد
          </button>
          {!isProtectedUser(u) && (
            <>
              <button
                type="button"
                onClick={() => handleToggleUserStatus(u)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                  u.status === 'active'
                    ? 'bg-orange-100 text-orange-900 hover:bg-orange-200'
                    : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                }`}
              >
                {u.status === 'active' ? 'إيقاف' : 'تفعيل'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTargetUser(u)}
                className="px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
                title="حذف المستخدم نهائياً"
              >
                <Trash2 className="w-3 h-3" />
                <span>حذف</span>
              </button>
            </>
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
      render: (l) => <span className="font-extrabold text-[#1E3346]">{l.fullName}</span>,
    },
    {
      key: 'action',
      label: 'العملية',
      headerText: 'العملية',
      type: 'text',
      defaultWidth: 165,
      render: (l) => <span className="font-extrabold text-[#2B6270]">{l.action}</span>,
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
          <span className="text-red-800 font-extrabold">تنبيه</span>
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
          className="px-2.5 py-1 rounded-lg bg-[#253B4F] text-[#94C9CE] text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
        >
          <Eye className="w-3 h-3" />
          <span>معاينة</span>
        </button>
      ),
    },
  ];

  const addPwStrength = getPasswordStrength(newUserForm.password);
  const editPwStrength = getPasswordStrength(editForm.newPassword);
  const modalPwStrength = getPasswordStrength(newPassValue);

  return (
    <div className="space-y-5">
      {toastMsg && (
        <div className="bg-gradient-to-l from-[#253B4F] to-[#2F5368] text-white px-4 py-3 rounded-2xl text-xs font-black shadow-lg border border-white/20 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#94C9CE]" />
            <span>{toastMsg}</span>
          </span>
          <button type="button" onClick={() => setToastMsg('')} className="text-white/70 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Smart Header Banner */}
      <div className="rounded-[24px] bg-gradient-to-l from-[#253B4F] via-[#2C4B60] to-[#3B717E] text-white p-5 shadow-lg border border-white/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[#94C9CE] text-[11px] font-black mb-1">
            <Database className="w-4 h-4 shrink-0" />
            <span>منظومة الحوكمة وإدارة الحسابات والصلاحيات الذكية</span>
            <span aria-hidden="true">·</span>
            <span className="text-white/90">{dbEngineLabel}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black">
            إدارة المستخدمين والأدوار وكلمات المرور ومصفوفة الصلاحيات
          </h2>
          <p className="text-xs text-slate-200 font-bold mt-1">
            إضافة وتعديل وحذف الحسابات وتشفير كلمات المرور مباشرة في قاعدة البيانات، مع قوالب الصلاحيات التلقائية.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void refreshUsersFromDb()}
            disabled={isDbBusy}
            className="px-3.5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center gap-1.5 border border-white/25 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
            title="تحديث البيانات من قاعدة البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDbBusy ? 'animate-spin' : ''}`} />
            <span>مزامنة القاعدة</span>
          </button>
          <button
            type="button"
            onClick={openAddUserModal}
            className="px-4 py-2.5 rounded-full bg-gradient-to-b from-[#E5F1F3] to-[#C2DCE0] text-[#1E3346] text-xs font-black flex items-center gap-1.5 shadow-md hover:brightness-105 cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className="px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center gap-1.5 border border-white/25 cursor-pointer whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#94C9CE]" />
            <span>مصفوفة الصلاحيات</span>
          </button>
        </div>
      </div>

      {/* Animated Tactile KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="إجمالي المستخدمين"
          value={users.length}
          indicator={`نشط: ${toArabicNumerals(activeCount)}`}
          icon={Users}
          theme="teal"
          delay={0}
          onClick={() => setActiveTab('users')}
        />
        <AnimatedStatCard
          title="طلبات التسجيل الجديدة"
          value={pendingCount}
          indicator="تحتاج مراجعة واعتماد"
          icon={UserCheck}
          theme="blue"
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
      <div className="bg-white/80 backdrop-blur-md rounded-[22px] shadow-xs border border-white/80 p-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab('users'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-[#253B4F] text-white shadow-sm' : 'text-[#1E3346] hover:bg-white'
            }`}
          >
            المستخدمون وكلمات المرور ({toArabicNumerals(users.length)})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('permissions'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              activeTab === 'permissions' ? 'bg-[#253B4F] text-white shadow-sm' : 'text-[#1E3346] hover:bg-white'
            }`}
          >
            الصلاحيات والأقسام ({toArabicNumerals(departments.length)})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('requests'); setSelectedIds([]); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              activeTab === 'requests' ? 'bg-[#253B4F] text-white shadow-sm' : 'text-[#1E3346] hover:bg-white'
            }`}
          >
            <span>طلبات التسجيل</span>
            {pendingCount > 0 && (
              <span className="bg-[#94C9CE] text-[#1E3346] px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums">
                {toArabicNumerals(pendingCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('branches'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              activeTab === 'branches' ? 'bg-[#253B4F] text-white shadow-sm' : 'text-[#1E3346] hover:bg-white'
            }`}
          >
            إدارة الفروع ({toArabicNumerals(branches.length)})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('audit'); setSelectedIds([]); }}
            className={`px-4 py-2 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-[#253B4F] text-white shadow-sm' : 'text-[#1E3346] hover:bg-white'
            }`}
          >
            التدقيق الأمني ({toArabicNumerals(auditLogs.length)})
          </button>
        </div>

        <div className="relative min-w-[240px] flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث فوري بالاسم أو الهاتف أو الرقم القومي..."
            className="w-full pr-10 pl-3 py-2 bg-[#E9EFF4] border border-white rounded-full text-[11px] font-bold text-[#1E3346] focus:outline-none focus:ring-2 focus:ring-[#3B717E]"
          />
        </div>
      </div>

      {/* Tab Content: Users */}
      {activeTab === 'users' && (
        <div className="bg-white/85 backdrop-blur-md rounded-[22px] shadow-xs border border-white/80 p-4 space-y-3.5">
          {/* Smart Role/Status Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `الكل (${toArabicNumerals(users.length)})` },
                { id: 'managers', label: 'المديرون والمشرفون' },
                { id: 'officers', label: 'مسؤولو الأقسام' },
                { id: 'inspectors', label: 'المفتشون والرقابة' },
                { id: 'suspended', label: 'الموقوفون / إجازة' },
                { id: 'no_custom_password', label: 'دون كلمة مرور مخصصة' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setUserFilterChip(chip.id as UserFilterChip)}
                  className={`px-3 py-1.5 rounded-full text-[10.5px] font-black transition-all cursor-pointer ${
                    userFilterChip === chip.id
                      ? 'bg-[#3B717E] text-white shadow-xs'
                      : 'bg-[#EEF3F7] text-[#1E3346] hover:bg-[#DCE6EE]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={openAddUserModal}
              className="px-3.5 py-2 rounded-full bg-[#253B4F] hover:bg-[#1E3142] text-[#94C9CE] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم جديد + كلمة مرور</span>
            </button>
          </div>

          {/* Bulk Action Toolbar when rows are selected */}
          {selectedIds.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#253B4F] text-white flex flex-wrap items-center justify-between gap-2 shadow-sm">
              <span className="text-xs font-black">
                تم تحديد <span className="num-cell text-[#94C9CE]">{toArabicNumerals(selectedIds.length)}</span> مستخدم للعمليات الجماعية
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkConfirmAction('activate')}
                  className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تفعيل المحدد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkConfirmAction('suspend')}
                  className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-[#1E3346] text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>إيقاف المحدد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkConfirmAction('delete')}
                  className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المحدد نهائياً</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-black cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>
          )}

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
            emptyMessage="لا توجد حسابات مطابقة للتصفية الحالية."
          />
        </div>
      )}

      {/* Tab Content: Registration Requests */}
      {activeTab === 'requests' && (
        <div className="bg-white/85 backdrop-blur-md rounded-[22px] shadow-xs border border-white/80 p-4 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-3">
            <h3 className="text-[13px] font-black text-[#1E3346]">طلبات إنشاء الحسابات الجديدة الواردة</h3>
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

      {/* Tab Content: Branches */}
      {activeTab === 'branches' && (
        <div className="bg-white/85 backdrop-blur-md rounded-[22px] shadow-xs border border-white/80 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-[#EEF3F7]">
            <h3 className="text-[13px] font-black text-[#1E3346]">
              إدارة فروع وإدارات التموين بالمحافظة ({toArabicNumerals(branches.length)} فرعاً إدارياً)
            </h3>
            <span className="text-[11px] font-extrabold text-emerald-700">العزل الإداري للفروع مفعل</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {branches.map((b, idx) => (
              <div key={b.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] bg-[#253B4F] text-[#94C9CE] px-2.5 py-0.5 rounded-full font-black">
                      إدارة رقم {toArabicNumerals(idx + 1)}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      نشط ومؤمن
                    </span>
                  </div>
                  <h4 className="text-[13px] font-black text-[#1E3346] mb-1">{b.arabicName}</h4>
                  <p className="text-[11px] font-bold text-slate-700 mb-1">المدير المسؤول: {b.managerName}</p>
                  <p className="text-[11px] text-slate-700 font-bold">الهاتف: <span className="num-cell">{toArabicNumerals(b.phone)}</span></p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 font-bold">{b.address}</span>
                  <span className="text-[#2B6270] font-black">صلاحيات كاملة</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white/85 backdrop-blur-md rounded-[22px] shadow-xs border border-white/80 p-4 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-3">
            <h3 className="text-[13px] font-black text-[#1E3346]">سجل النشاط والتدقيق الأمني غير القابل للتعديل</h3>
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
          <div className="bg-white/85 backdrop-blur-md rounded-[22px] shadow-xs border border-white/80 p-4 space-y-4">
            <h3 className="text-[13px] font-black text-[#1E3346] flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Layers className="w-4 h-4 text-[#3B717E]" />
              <span>إدارة الأقسام ومصفوفة الصلاحيات الذكية (إضافة أو إلغاء قسم + قوالب الصلاحيات)</span>
            </h3>

            <form onSubmit={handleAddDepartment} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs bg-[#EEF3F7] p-3 rounded-2xl border border-white">
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
                className="px-4 py-2 rounded-xl bg-[#253B4F] text-[#94C9CE] font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة قسم للصلاحيات</span>
              </button>
            </form>

            {/* User selector & smart permission templates */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-black text-[#1E3346]">الموظف المحدد:</span>
                <select
                  value={selectedPermUserId}
                  onChange={(e) => setSelectedPermUserId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 font-black text-[#1E3346] bg-[#EEF3F7]"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} — {getRoleArabicLabel(u.role)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPermTemplateToSelected('preset')}
                  className="px-3 py-1.5 rounded-full bg-[#3B717E] hover:bg-[#2F5D68] text-white text-[11px] font-black cursor-pointer"
                >
                  تطبيق قالب الدور الوظيفي
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPermTemplateToSelected('all')}
                  className="px-3 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black cursor-pointer"
                >
                  منح جميع الأقسام
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPermTemplateToSelected('minimal')}
                  className="px-3 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 text-[11px] font-black cursor-pointer"
                >
                  سحب الصلاحيات للأساسي
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#253B4F] text-white">
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
                      <tr key={dept.id} className="border-b border-slate-200 hover:bg-[#EEF3F7]">
                        <td className="p-2 border border-slate-200 num-cell font-black text-[#2B6270]">{dept.code}</td>
                        <td className="p-2 border border-slate-200 font-black text-[#1E3346]">{dept.arabicName}</td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-600">{dept.description}</td>
                        <td className="p-2 border border-slate-200 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${hasDept ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500'}`}>
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

      {/* Modal: Quick User Preview */}
      {previewUser && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPreviewUser(null)}>
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-l from-[#253B4F] to-[#3B717E] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#DCECEF] text-[#1E3346] flex items-center justify-center font-black text-base">
                  {previewUser.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-black">{previewUser.fullName}</h4>
                  <p className="text-[11px] font-bold text-[#94C9CE]">
                    {previewUser.jobTitle} · {getRoleArabicLabel(previewUser.role)}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setPreviewUser(null)} className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-[#F4F7FA] p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">اسم المستخدم</span>
                  <span className="font-mono font-black text-[#1E3346]">{previewUser.username}</span>
                </div>
                <div className="bg-[#F4F7FA] p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">الرقم القومي</span>
                  <span className="num-cell font-black text-[#1E3346]">{toArabicNumerals(previewUser.nationalId)}</span>
                </div>
                <div className="bg-[#F4F7FA] p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">الهاتف</span>
                  <span className="num-cell font-black text-[#1E3346]">{toArabicNumerals(previewUser.phone)}</span>
                </div>
                <div className="bg-[#F4F7FA] p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">الفرع الأساسي</span>
                  <span className="font-black text-[#1E3346]">
                    {branches.find((b) => b.id === previewUser.primaryBranchId)?.arabicName || 'إدارة تموين الغربية'}
                  </span>
                </div>
                <div className="bg-[#F4F7FA] p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">الحالة</span>
                  <div className="mt-0.5">{getStatusBadge(previewUser.status)}</div>
                </div>
                <div className="bg-[#F4F7FA] p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">الأقسام المفعلة</span>
                  <span className="num-cell font-black text-[#2B6270]">{toArabicNumerals(previewUser.departmentIds.length)} قسماً</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-black text-[#1E3346] block mb-1.5">الأقسام المصرح بالدخول إليها:</span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {departments
                    .filter((d) => previewUser.departmentIds.includes(d.id))
                    .map((d) => (
                      <span key={d.id} className="px-2.5 py-1 rounded-full bg-[#DCECEF] text-[#1E3346] text-[10px] font-black">
                        {d.arabicName}
                      </span>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const u = previewUser;
                    setPreviewUser(null);
                    openEditUserModal(u);
                  }}
                  className="px-4 py-2 rounded-full bg-[#253B4F] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#94C9CE]" />
                  <span>تعديل الحساب والصلاحيات</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Password Update */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPasswordModalUser(null)}>
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h4 className="text-sm font-black text-[#1E3346] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#3B717E]" />
                <span>تعيين كلمة مرور: {passwordModalUser.fullName}</span>
              </h4>
              <button type="button" onClick={() => setPasswordModalUser(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <label className="block font-black text-[#1E3346]">كلمة المرور الجديدة (٤ أحرف على الأقل)</label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type={showPassField ? 'text' : 'password'}
                    value={newPassValue}
                    onChange={(e) => setNewPassValue(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassField(!showPassField)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassField ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setNewPassValue(generateStrongPassword())}
                  className="px-3 py-2.5 rounded-xl bg-[#EEF3F7] hover:bg-[#DCE6EE] text-[#1E3346] font-black inline-flex items-center gap-1 cursor-pointer"
                  title="توليد كلمة مرور قوية تلقائياً"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>توليد</span>
                </button>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${modalPwStrength.color}`} style={{ width: `${modalPwStrength.score}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-500">قوة كلمة المرور: {modalPwStrength.label}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setPasswordModalUser(null)} className="px-4 py-2 rounded-full bg-slate-200 text-[#1E3346] text-xs font-black cursor-pointer">
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleSaveUserPassword(passwordModalUser, newPassValue)}
                className="px-4 py-2 rounded-full bg-[#253B4F] text-[#94C9CE] text-xs font-black cursor-pointer"
              >
                حفظ كلمة المرور
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Smart Add User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAddUserModal(false)}>
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-l from-[#253B4F] to-[#3B717E] text-white px-5 py-4 flex items-center justify-between">
              <h4 className="text-sm font-black flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#94C9CE]" />
                <span>إضافة مستخدم جديد + تعيين الدور والصلاحيات التلقائية</span>
              </h4>
              <button type="button" onClick={() => setShowAddUserModal(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateNewUser} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs max-h-[82vh] overflow-y-auto">
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الاسم الرباعي *</label>
                <input type="text" required value={newUserForm.fullName} onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">اسم المستخدم للدخول *</label>
                <input type="text" required value={newUserForm.username} onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">كلمة المرور *</label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewUserForm({ ...newUserForm, password: generateStrongPassword() })}
                    className="px-2.5 py-2 rounded-xl bg-[#EEF3F7] text-[#1E3346] font-black cursor-pointer"
                    title="توليد تلقائي"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${addPwStrength.color}`} style={{ width: `${addPwStrength.score}%` }} />
                </div>
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الرقم القومي (١٤ رقماً)</label>
                <input type="text" value={newUserForm.nationalId} onChange={(e) => setNewUserForm({ ...newUserForm, nationalId: e.target.value })} placeholder="29001011600099" className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">رقم الهاتف</label>
                <input type="text" value={newUserForm.phone} onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">المسمى الوظيفي</label>
                <input type="text" value={newUserForm.jobTitle} onChange={(e) => setNewUserForm({ ...newUserForm, jobTitle: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الدور الوظيفي (يضبط الأقسام تلقائياً)</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => {
                    const nextRole = e.target.value as UserRole;
                    setNewUserForm({
                      ...newUserForm,
                      role: nextRole,
                      jobTitle: ROLE_OPTIONS.find((r) => r.value === nextRole)?.label || newUserForm.jobTitle,
                      departmentIds: getPresetDeptIds(nextRole, departments),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الإدارة التموينية</label>
                <select value={newUserForm.primaryBranchId} onChange={(e) => setNewUserForm({ ...newUserForm, primaryBranchId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black">
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.arabicName}</option>)}
                </select>
              </div>

              {/* Department checkboxes */}
              <div className="sm:col-span-2 bg-[#F4F7FA] p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-[#1E3346]">صلاحيات الأقسام ({toArabicNumerals(newUserForm.departmentIds.length)} / {toArabicNumerals(departments.length)})</span>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setNewUserForm({ ...newUserForm, departmentIds: departments.map((d) => d.id) })} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black cursor-pointer">تحديد الكل</button>
                    <button type="button" onClick={() => setNewUserForm({ ...newUserForm, departmentIds: getPresetDeptIds(newUserForm.role, departments) })} className="px-2.5 py-1 rounded-full bg-[#DCECEF] text-[#1E3346] text-[10px] font-black cursor-pointer">قالب الدور</button>
                    <button type="button" onClick={() => setNewUserForm({ ...newUserForm, departmentIds: [] })} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black cursor-pointer">إلغاء الكل</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                  {departments.map((dept) => {
                    const checked = newUserForm.departmentIds.includes(dept.id);
                    return (
                      <label key={dept.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10.5px] font-bold cursor-pointer ${checked ? 'bg-[#DCECEF] border-[#3B717E] text-[#1E3346]' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setNewUserForm((prev) => ({
                              ...prev,
                              departmentIds: checked
                                ? prev.departmentIds.filter((id) => id !== dept.id)
                                : [...prev.departmentIds, dept.id],
                            }))
                          }
                          className="accent-[#253B4F]"
                        />
                        <span className="truncate">{dept.arabicName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 rounded-full bg-slate-200 text-[#1E3346] font-black cursor-pointer">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-full bg-[#253B4F] text-[#94C9CE] font-black cursor-pointer">حفظ وإنشاء المستخدم</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Smart Edit User */}
      {editModalUser && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditModalUser(null)}>
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-l from-[#253B4F] to-[#3B717E] text-white px-5 py-4 flex items-center justify-between">
              <h4 className="text-sm font-black flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#94C9CE]" />
                <span>تعديل بيانات وصلاحيات: {editModalUser.fullName}</span>
              </h4>
              <button type="button" onClick={() => setEditModalUser(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditedUser} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs max-h-[82vh] overflow-y-auto">
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الاسم الرباعي *</label>
                <input type="text" required value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">اسم المستخدم *</label>
                <input type="text" required value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الرقم القومي</label>
                <input type="text" value={editForm.nationalId} onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">رقم الهاتف</label>
                <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">المسمى الوظيفي</label>
                <input type="text" value={editForm.jobTitle} onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الدرجة الوظيفية</label>
                <input type="text" value={editForm.jobGrade} onChange={(e) => setEditForm({ ...editForm, jobGrade: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold" />
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الدور الوظيفي</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black">
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الحالة الوظيفية</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as EmployeeStatus })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black">
                  <option value="active">نشط على رأس العمل</option>
                  <option value="suspended">موقوف</option>
                  <option value="leave">في إجازة</option>
                  <option value="seconded">إعارة / مأمورية</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">الفرع الإداري الأساسي</label>
                <select value={editForm.primaryBranchId} onChange={(e) => setEditForm({ ...editForm, primaryBranchId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black">
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.arabicName}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-black mb-1 text-[#1E3346]">تغيير كلمة المرور (اختياري)</label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type={showEditPass ? 'text' : 'password'}
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                      placeholder="اتركه فارغاً للإبقاء على الحالية"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPass(!showEditPass)}
                      className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showEditPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, newPassword: generateStrongPassword() })}
                    className="px-2.5 py-2 rounded-xl bg-[#EEF3F7] text-[#1E3346] font-black cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                {editForm.newPassword && (
                  <div className="mt-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${editPwStrength.color}`} style={{ width: `${editPwStrength.score}%` }} />
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 bg-[#F4F7FA] p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-[#1E3346]">الأقسام المصرح بها ({toArabicNumerals(editForm.departmentIds.length)} / {toArabicNumerals(departments.length)})</span>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setEditForm({ ...editForm, departmentIds: departments.map((d) => d.id) })} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black cursor-pointer">تحديد الكل</button>
                    <button type="button" onClick={() => setEditForm({ ...editForm, departmentIds: getPresetDeptIds(editForm.role, departments) })} className="px-2.5 py-1 rounded-full bg-[#DCECEF] text-[#1E3346] text-[10px] font-black cursor-pointer">قالب الدور</button>
                    <button type="button" onClick={() => setEditForm({ ...editForm, departmentIds: [] })} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-black cursor-pointer">إلغاء الكل</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                  {departments.map((dept) => {
                    const checked = editForm.departmentIds.includes(dept.id);
                    return (
                      <label key={dept.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10.5px] font-bold cursor-pointer ${checked ? 'bg-[#DCECEF] border-[#3B717E] text-[#1E3346]' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setEditForm((prev) => ({
                              ...prev,
                              departmentIds: checked
                                ? prev.departmentIds.filter((id) => id !== dept.id)
                                : [...prev.departmentIds, dept.id],
                            }))
                          }
                          className="accent-[#253B4F]"
                        />
                        <span className="truncate">{dept.arabicName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setEditModalUser(null)} className="px-4 py-2 rounded-full bg-slate-200 text-[#1E3346] font-black cursor-pointer">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-full bg-[#253B4F] text-[#94C9CE] font-black cursor-pointer">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Single User Delete Confirmation */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setDeleteTargetUser(null)}>
          <div className="bg-white rounded-[24px] border border-red-200 shadow-2xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 text-red-700">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black">تأكيد حذف حساب مستخدم نهائياً</h4>
                <p className="text-[11px] font-bold text-slate-600">سيتم إزالة الحساب وكلمة المرور المرتبطة به من المنظومة</p>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-red-50 border border-red-100 text-xs font-bold text-red-950">
              الموظف: <span className="font-black">{deleteTargetUser.fullName}</span> ({deleteTargetUser.username})
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDeleteTargetUser(null)} className="px-4 py-2 rounded-full bg-slate-200 text-[#1E3346] text-xs font-black cursor-pointer">تراجع</button>
              <button type="button" onClick={() => void handleConfirmDeleteSingleUser()} className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer">تأكيد الحذف النهائي</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Action Confirmation */}
      {bulkConfirmAction && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setBulkConfirmAction(null)}>
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-black text-[#1E3346]">
              {bulkConfirmAction === 'delete'
                ? 'تأكيد الحذف الجماعي للمستخدمين'
                : bulkConfirmAction === 'activate'
                ? 'تأكيد التفعيل الجماعي للحسابات'
                : 'تأكيد الإيقاف الجماعي للحسابات'}
            </h4>
            <p className="text-xs font-bold text-slate-600 leading-relaxed">
              سيتم تطبيق الإجراء على عدد ({toArabicNumerals(selectedIds.length)}) حساباً محدداً (مع استثناء الحساب الحالي أو آخر مدير أعلى تلقائياً لضمان أمان النظام).
            </p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setBulkConfirmAction(null)} className="px-4 py-2 rounded-full bg-slate-200 text-[#1E3346] text-xs font-black cursor-pointer">إلغاء</button>
              <button
                type="button"
                onClick={() => void handleExecuteBulkAction()}
                className={`px-4 py-2 rounded-full text-white text-xs font-black cursor-pointer ${
                  bulkConfirmAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#253B4F] hover:bg-[#1E3142]'
                }`}
              >
                تنفيذ الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
