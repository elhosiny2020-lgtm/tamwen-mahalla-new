import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_USERS } from '@/lib/mock-db';
import { loginFormSchema } from '@/lib/zod-schemas';
import { recordServerAuditLog } from '@/lib/server/audit-log-store';
import {
  claimInitialAdminPasscode,
  getAdminPasscodeStatus,
  setServerUserPassword,
  verifyAdminPasscode,
  verifyServerUserPasswordOverride,
} from '@/lib/server/admin-credential-store';
import {
  countDbUsers,
  createDbUser,
  getDbUserByUsername,
  setDbUserPasswordByUsername,
  touchDbUserLastLogin,
  verifyDbUserPasswordByUsername,
} from '@/lib/server/users-db';
import {
  checkSlidingWindowRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from '@/lib/server/rate-limit';
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from '@/lib/server/session-token';
import { getRoleArabicLabel } from '@/lib/utils';
import type { UserRole } from '@/types';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'متصفح الويب المعتمد';
  const rl = checkSlidingWindowRateLimit({
    key: `auth:login:${ip}`,
    limit: 25,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    recordServerAuditLog({
      userId: 'anonymous',
      username: 'rate_limited',
      fullName: 'محاولة متكررة',
      action: 'تجاوز حد محاولات تسجيل الدخول',
      module: 'بوابة المصادقة الموحدة',
      details: 'تم حظر المحاولة مؤقتاً لتجاوز الحد الأقصى لمحاولات الدخول',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'warning',
    });
    return rateLimitExceededResponse(
      'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة لاحقاً.',
      rl.retryAfterSeconds
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }

  const parsed = loginFormSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'يرجى إدخال اسم المستخدم وكلمة المرور بشكل صحيح.' },
      { status: 400 }
    );
  }

  const { username, password, branchId, isDirectRegistration, registeredUser } = parsed.data;
  const trimmedUsername = username.trim();
  const normalizedUsername = trimmedUsername.toLowerCase();

  let dbUser = getDbUserByUsername(trimmedUsername);

  // If direct registration from RegisterWizard, persist into real SQLite DB immediately
  if (isDirectRegistration && registeredUser) {
    if (!dbUser) {
      const fallbackBranch = registeredUser.primaryBranchId || branchId || 'b-03';
      const created = await createDbUser({
        id: registeredUser.id,
        fullName: registeredUser.fullName,
        username: trimmedUsername,
        password,
        nationalId: registeredUser.nationalId || '29501011600001',
        phone: registeredUser.phone || '01000000000',
        email: registeredUser.email || `${trimmedUsername}@supply.gov.eg`,
        jobTitle: registeredUser.jobTitle || 'موظف تموين',
        jobGrade: registeredUser.jobGrade || 'الثالثة التخصصية',
        workplace: registeredUser.workplace || 'مديرية التموين بالغربية',
        primaryBranchId: fallbackBranch,
        branchIds:
          registeredUser.branchIds && registeredUser.branchIds.length > 0
            ? registeredUser.branchIds
            : [fallbackBranch],
        departmentIds:
          registeredUser.departmentIds && registeredUser.departmentIds.length > 0
            ? registeredUser.departmentIds
            : ['d-01', 'd-02', 'd-25'],
        role: (registeredUser.role || 'bakery_officer') as UserRole,
        status: 'active',
        createdBy: 'self_register',
      });
      if (created.ok) {
        dbUser = created.user;
        setServerUserPassword(created.user.username, password, created.user.username);
      }
    } else {
      await setDbUserPasswordByUsername(dbUser.username, password);
      setServerUserPassword(dbUser.username, password, dbUser.username);
    }
  }

  // Emergency bootstrap ONLY if the database has 0 users (e.g., immediately after a full wipe of all users)
  // and the operator signs in as 'admin' so they are never permanently locked out.
  if (!dbUser && !isDirectRegistration && countDbUsers() === 0 && normalizedUsername === 'admin') {
    const passcodeStatus = getAdminPasscodeStatus();
    const canBootstrap =
      !passcodeStatus.configured || verifyAdminPasscode(password).valid;
    if (canBootstrap) {
      const template = INITIAL_USERS[0];
      const recreated = await createDbUser({
        id: template.id,
        fullName: template.fullName,
        username: 'admin',
        password,
        nationalId: template.nationalId,
        phone: template.phone,
        email: template.email,
        jobTitle: template.jobTitle,
        jobGrade: template.jobGrade,
        workplace: template.workplace,
        primaryBranchId: branchId || template.primaryBranchId,
        branchIds: template.branchIds,
        departmentIds: template.departmentIds,
        role: 'super_admin',
        status: 'active',
        createdBy: 'bootstrap_recovery',
      });
      if (recreated.ok) {
        dbUser = recreated.user;
        setServerUserPassword('admin', password, 'admin');
      }
    }
  }

  const user = dbUser;

  if (!user) {
    recordServerAuditLog({
      userId: 'anonymous',
      username: trimmedUsername,
      fullName: 'مستخدم غير مسجل',
      action: 'محاولة تسجيل دخول فاشلة',
      module: 'بوابة المصادقة الموحدة',
      details: `محاولة دخول باسم مستخدم غير مسجل (${trimmedUsername})`,
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'failed',
    });
    return NextResponse.json(
      { ok: false, error: 'اسم المستخدم غير مسجل بالمنظومة أو تم حذفه. يرجى التحقق من اسم المستخدم.' },
      { status: 401 }
    );
  }

  if (user.status === 'suspended' || user.status === 'inactive') {
    recordServerAuditLog({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'محاولة دخول لحساب موقوف',
      module: 'بوابة المصادقة الموحدة',
      branchId: branchId || user.primaryBranchId,
      details: 'تم رفض الدخول لأن الحساب موقوف إدارياً',
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'failed',
    });
    return NextResponse.json(
      { ok: false, error: 'عذراً، هذا الحساب موقوف إدارياً. يرجى مراجعة مدير النظام.' },
      { status: 403 }
    );
  }

  const isAdminRole =
    user.role === 'super_admin' ||
    user.role === 'admin' ||
    user.role === 'directorate_manager' ||
    user.role === 'supply_admin_manager' ||
    user.role === 'department_manager';

  if (!isDirectRegistration) {
    // 1. Check authoritative SQLite DB custom password hash first
    const dbCheck = verifyDbUserPasswordByUsername(user.username, password);
    if (dbCheck.disabled) {
      return NextResponse.json(
        { ok: false, error: 'تم حذف كلمة المرور الخاصة بهذا الحساب من قبل مدير النظام. يرجى تعيين كلمة مرور جديدة.' },
        { status: 401 }
      );
    }

    if (dbCheck.hasCustomPassword) {
      if (!dbCheck.valid) {
        recordServerAuditLog({
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          action: 'محاولة تسجيل دخول فاشلة (كلمة مرور خاطئة)',
          module: 'بوابة المصادقة الموحدة',
          branchId: branchId || user.primaryBranchId,
          details: 'كلمة المرور المدخلة غير مطابقة لكلمة المرور المحفوظة بقاعدة البيانات',
          ipAddress: ip,
          deviceInfo: userAgent,
          status: 'failed',
        });
        return NextResponse.json(
          { ok: false, error: 'كلمة المرور غير صحيحة. يرجى إدخال كلمة المرور المسجلة في صلاحيات المستخدمين.' },
          { status: 401 }
        );
      }
      // Keep server memory cache synchronized for verify-admin checks
      setServerUserPassword(user.username, password, user.username);
    } else {
      // 2. Legacy account with no SQLite hash yet — check override or bootstrap passcode, then persist permanently to SQLite
      const userOverride = verifyServerUserPasswordOverride(user.username, password);
      if (userOverride.hasOverride) {
        if (userOverride.deleted) {
          return NextResponse.json(
            { ok: false, error: 'تم حذف كلمة المرور الخاصة بهذا الحساب من قبل مدير النظام. يرجى تعيين كلمة مرور جديدة.' },
            { status: 401 }
          );
        }
        if (!userOverride.valid) {
          return NextResponse.json(
            { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' },
            { status: 401 }
          );
        }
        await setDbUserPasswordByUsername(user.username, password);
      } else {
        const passcodeStatus = getAdminPasscodeStatus();
        if (passcodeStatus.configured) {
          const check = verifyAdminPasscode(password);
          if (!check.valid) {
            recordServerAuditLog({
              userId: user.id,
              username: user.username,
              fullName: user.fullName,
              action: 'محاولة تسجيل دخول فاشلة (كلمة مرور خاطئة)',
              module: 'بوابة المصادقة الموحدة',
              branchId: branchId || user.primaryBranchId,
              details: 'كلمة المرور المدخلة غير مطابقة',
              ipAddress: ip,
              deviceInfo: userAgent,
              status: 'failed',
            });
            return NextResponse.json(
              { ok: false, error: 'كلمة المرور غير صحيحة لهذا الحساب.' },
              { status: 401 }
            );
          }
          // Permanently persist password into SQLite so it is always recognized immediately
          await setDbUserPasswordByUsername(user.username, password);
          setServerUserPassword(user.username, password, user.username);
        } else {
          if (isAdminRole) {
            const claimed = claimInitialAdminPasscode(password, user.username);
            if (!claimed.ok) {
              return NextResponse.json(
                { ok: false, error: 'تعذر تهيئة كلمة المرور الإدارية. يرجى استخدام كلمة مرور لا تقل عن ٤ أحرف.' },
                { status: 400 }
              );
            }
          }
          await setDbUserPasswordByUsername(user.username, password);
          setServerUserPassword(user.username, password, user.username);
        }
      }
    }
  }

  try {
    const activeBranch = branchId || user.primaryBranchId;
    touchDbUserLastLogin(user.id);

    const token = await signSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      branchId: activeBranch,
    });

    recordServerAuditLog({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      action: 'تسجيل دخول رسمي ناجح',
      module: 'بوابة المصادقة الموحدة',
      branchId: activeBranch,
      details: `تم إصدار جلسة مصادقة رسمية بدور (${getRoleArabicLabel(user.role)})`,
      ipAddress: ip,
      deviceInfo: userAgent,
      status: 'success',
    });

    const response = NextResponse.json(
      {
        ok: true,
        user: {
          ...user,
          primaryBranchId: activeBranch,
          lastLogin: new Date().toISOString(),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'تعذر إنشاء جلسة المصادقة على الخادم حالياً.' },
      { status: 500 }
    );
  }
}
