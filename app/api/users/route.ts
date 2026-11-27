import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/server/auth-guard';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import { getClientIp } from '@/lib/server/rate-limit';
import {
  createDbUser,
  deleteDbUsersByIds,
  getDbUserById,
  getUsersDbEngineInfo,
  listDbUsers,
  updateDbUser,
  wipeAllDbUsers,
} from '@/lib/server/users-db';
import {
  clearAllServerUserPasswordOverrides,
  deleteServerUserPassword,
  setServerUserPassword,
} from '@/lib/server/admin-credential-store';
import { sanitizedString } from '@/lib/zod-schemas';
import type { EmployeeStatus, UserRole } from '@/types';

const VALID_ROLES = [
  'super_admin',
  'admin',
  'directorate_manager',
  'deputy_directorate',
  'supply_admin_manager',
  'supply_deputy',
  'department_manager',
  'section_head',
  'supply_inspector',
  'control_inspector',
  'bakery_officer',
  'debts_officer',
  'internal_trade_officer',
  'commodities_officer',
  'grain_officer',
  'hr_officer',
  'financial_officer',
  'warehouse_officer',
  'reports_officer',
  'data_entry',
  'reviewer',
  'collector',
  'monitor',
  'viewer',
  'custom',
] as const;

const VALID_STATUSES = ['active', 'seconded', 'leave', 'suspended', 'inactive', 'pending'] as const;

const CreateUserSchema = z.object({
  fullName: sanitizedString({ min: 3, max: 140, minMessage: 'الاسم الكامل مطلوب (٣ أحرف على الأقل)' }),
  username: sanitizedString({
    min: 3,
    max: 60,
    minMessage: 'اسم المستخدم مطلوب (٣ أحرف على الأقل)',
    pattern: /^[a-zA-Z0-9_.\-\u0600-\u06FF]+$/,
    patternMessage: 'اسم المستخدم يحتوي على رموز غير مسموحة',
  }),
  password: z.string().min(4, 'كلمة المرور ٤ أحرف على الأقل').max(256).optional().or(z.literal('')),
  nationalId: z.string().trim().max(20).optional().default('29501011600001'),
  phone: z.string().trim().max(20).optional().default('01000000000'),
  email: z.string().trim().max(140).optional().default(''),
  jobTitle: sanitizedString({ min: 2, max: 140 }).optional().default('موظف تموين'),
  jobGrade: sanitizedString({ min: 1, max: 80 }).optional().default('الثالثة التخصصية'),
  workplace: sanitizedString({ min: 2, max: 160 }).optional().default('مديرية التموين بالغربية'),
  role: z.enum(VALID_ROLES).default('bakery_officer'),
  status: z.enum(VALID_STATUSES).default('active'),
  primaryBranchId: sanitizedString({ min: 1, max: 40 }).default('b-03'),
  branchIds: z.array(sanitizedString({ min: 1, max: 40 })).optional(),
  departmentIds: z.array(sanitizedString({ min: 1, max: 40 })).optional(),
});

const PatchUserSchema = z.object({
  id: sanitizedString({ min: 1, max: 80 }),
  fullName: sanitizedString({ min: 2, max: 140 }).optional(),
  username: sanitizedString({
    min: 3,
    max: 60,
    pattern: /^[a-zA-Z0-9_.\-\u0600-\u06FF]+$/,
  }).optional(),
  nationalId: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().max(140).optional(),
  jobTitle: sanitizedString({ min: 1, max: 140 }).optional(),
  jobGrade: sanitizedString({ min: 1, max: 80 }).optional(),
  workplace: sanitizedString({ min: 1, max: 160 }).optional(),
  role: z.enum(VALID_ROLES).optional(),
  status: z.enum(VALID_STATUSES).optional(),
  primaryBranchId: sanitizedString({ min: 1, max: 40 }).optional(),
  branchIds: z.array(sanitizedString({ min: 1, max: 40 })).optional(),
  departmentIds: z.array(sanitizedString({ min: 1, max: 40 })).optional(),
  password: z.string().min(4).max(256).optional().or(z.literal('')),
  passwordAction: z.enum(['set', 'delete']).optional(),
});

const BulkDeleteSchema = z.object({
  ids: z.array(sanitizedString({ min: 1, max: 80 })).min(1).max(200),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const users = listDbUsers();
  const dbInfo = getUsersDbEngineInfo();
  return NextResponse.json(
    {
      ok: true,
      dbInfo,
      users,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'يرجى مراجعة بيانات المستخدم الجديد.' },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const result = await createDbUser({
    fullName: data.fullName,
    username: data.username,
    password: data.password || undefined,
    nationalId: data.nationalId || '29501011600001',
    phone: data.phone || '01000000000',
    email: data.email || `${data.username}@supply.gov.eg`,
    jobTitle: data.jobTitle,
    jobGrade: data.jobGrade,
    workplace: data.workplace,
    primaryBranchId: data.primaryBranchId,
    branchIds: data.branchIds?.length ? data.branchIds : [data.primaryBranchId],
    departmentIds: data.departmentIds?.length ? data.departmentIds : ['d-01', 'd-25'],
    role: data.role as UserRole,
    status: data.status as EmployeeStatus,
    createdBy: auth.session.username,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }

  if (data.password && data.password.trim().length >= 4) {
    setServerUserPassword(result.user.username, data.password.trim(), auth.session.username);
  }

  recordServerAuditLog({
    userId: auth.session.userId,
    username: auth.session.username,
    fullName: auth.session.username,
    action: 'إضافة مستخدم جديد بقاعدة البيانات',
    module: 'إدارة المستخدمين والصلاحيات',
    branchId: result.user.primaryBranchId,
    details: `تم إنشاء حساب (${result.user.fullName} — ${result.user.username}) وحفظه في قاعدة البيانات`,
    ipAddress: getClientIp(req),
    deviceInfo: req.headers.get('user-agent') || 'متصفح الويب المعتمد',
    status: 'success',
  });

  return NextResponse.json(
    { ok: true, user: result.user, dbInfo: getUsersDbEngineInfo() },
    { status: 201, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'بيانات التعديل غير صالحة.' }, { status: 400 });
  }

  const parsed = PatchUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'يرجى التحقق من الحقول المعدلة.' },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const before = getDbUserById(data.id);
  if (!before) {
    return NextResponse.json({ ok: false, error: 'المستخدم غير موجود.' }, { status: 404 });
  }

  const result = await updateDbUser({
    id: data.id,
    fullName: data.fullName,
    username: data.username,
    nationalId: data.nationalId,
    phone: data.phone,
    email: data.email,
    jobTitle: data.jobTitle,
    jobGrade: data.jobGrade,
    workplace: data.workplace,
    role: data.role as UserRole | undefined,
    status: data.status as EmployeeStatus | undefined,
    primaryBranchId: data.primaryBranchId,
    branchIds: data.branchIds,
    departmentIds: data.departmentIds,
    password: data.password || undefined,
    passwordAction: data.passwordAction,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  if (data.passwordAction === 'delete') {
    deleteServerUserPassword(result.user.username);
  } else if (data.password && data.password.trim().length >= 4) {
    setServerUserPassword(result.user.username, data.password.trim(), auth.session.username);
  }

  recordServerAuditLog({
    userId: auth.session.userId,
    username: auth.session.username,
    fullName: auth.session.username,
    action: 'تحديث بيانات/صلاحيات مستخدم بقاعدة البيانات',
    module: 'إدارة المستخدمين والصلاحيات',
    branchId: result.user.primaryBranchId,
    details: `تم تعديل حساب (${result.user.fullName} — ${result.user.username})`,
    ipAddress: getClientIp(req),
    deviceInfo: req.headers.get('user-agent') || 'متصفح الويب المعتمد',
    status: 'success',
  });

  return NextResponse.json(
    { ok: true, user: result.user, dbInfo: getUsersDbEngineInfo() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  const wipeAll = req.nextUrl.searchParams.get('all') === 'true';
  if (wipeAll) {
    const wiped = await wipeAllDbUsers();
    clearAllServerUserPasswordOverrides();

    recordServerAuditLog({
      userId: auth.session.userId,
      username: auth.session.username,
      fullName: auth.session.username,
      action: 'مسح شامل لجميع المستخدمين على جميع الفروع',
      module: 'إدارة المستخدمين والصلاحيات',
      branchId: auth.session.branchId,
      details: `تم المسح الشامل لعدد (${wiped.deletedCount}) مستخدم من كافة الإدارات والفروع نهائياً من قاعدة البيانات`,
      ipAddress: getClientIp(req),
      deviceInfo: req.headers.get('user-agent') || 'متصفح الويب المعتمد',
      status: 'warning',
    });

    return NextResponse.json(
      {
        ok: true,
        wipedAll: true,
        deletedCount: wiped.deletedCount,
        deletedIds: wiped.deletedIds,
        dbInfo: getUsersDbEngineInfo(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const singleId = req.nextUrl.searchParams.get('id')?.trim();
  let idsToDelete: string[] = [];

  if (singleId) {
    idsToDelete = [singleId];
  } else {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'يرجى تحديد المستخدم المطلوب حذفه.' }, { status: 400 });
    }
    const parsed = BulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'قائمة الحذف غير صالحة.' }, { status: 400 });
    }
    idsToDelete = parsed.data.ids;
  }

  // Also clear in-memory password overrides for deleted usernames
  const targetUsers = idsToDelete
    .map((id) => getDbUserById(id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const res = await deleteDbUsersByIds(idsToDelete, auth.session.userId);
  for (const u of targetUsers) {
    if (res.deletedIds.includes(u.id)) {
      deleteServerUserPassword(u.username);
    }
  }

  recordServerAuditLog({
    userId: auth.session.userId,
    username: auth.session.username,
    fullName: auth.session.username,
    action: 'حذف مستخدم من قاعدة البيانات',
    module: 'إدارة المستخدمين والصلاحيات',
    branchId: auth.session.branchId,
    details: `تم حذف عدد (${res.deletedIds.length}) مستخدم نهائياً من قاعدة البيانات`,
    ipAddress: getClientIp(req),
    deviceInfo: req.headers.get('user-agent') || 'متصفح الويب المعتمد',
    status: 'warning',
  });

  return NextResponse.json(
    {
      ok: true,
      deletedIds: res.deletedIds,
      skippedCount: res.skippedCount,
      dbInfo: getUsersDbEngineInfo(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
