import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_USERS } from '@/lib/mock-db';
import { getValidatedSupabaseAdminConfig } from '@/lib/server/supabase-admin';
import type { EmployeeStatus, User, UserRole } from '@/types';

interface SqliteStatement {
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Array<Record<string, unknown>>;
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
}

interface SqliteDatabase {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatement;
}

interface NodeSqliteModule {
  DatabaseSync: new (path: string) => SqliteDatabase;
}

export interface StoredSystemUser extends User {
  hasCustomPassword: boolean;
}

interface DbUserRow {
  id: string;
  full_name: string;
  national_id: string;
  phone: string;
  email: string;
  username: string;
  password_hash: string | null;
  password_salt: string | null;
  password_disabled: number;
  job_title: string;
  job_grade: string;
  workplace: string;
  branch_ids: string;
  primary_branch_id: string;
  department_ids: string;
  role: string;
  status: string;
  employee_number: string | null;
  failed_login_attempts: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const SCRYPT_KEYLEN = 64;

const globalForUsersDb = globalThis as unknown as {
  __gharbiaSqliteDb?: SqliteDatabase;
  __gharbiaSqliteInitialized?: boolean;
};

function getDbFilePath(): string {
  const custom = process.env.SQLITE_DB_PATH?.trim();
  if (custom) return custom;
  return path.join(process.cwd(), 'data', 'supply-system.db');
}

export function hashPasswordScrypt(password: string): { saltHex: string; hashHex: string } {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return {
    saltHex: salt.toString('hex'),
    hashHex: derived.toString('hex'),
  };
}

export function verifyPasswordScrypt(password: string, saltHex: string, hashHex: string): boolean {
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    if (salt.length === 0 || expected.length === 0) return false;
    const derived = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function getSqliteDb(): SqliteDatabase {
  if (!globalForUsersDb.__gharbiaSqliteDb) {
    const dbPath = getDbFilePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const sqliteMod = (process as unknown as { getBuiltinModule: (id: string) => NodeSqliteModule }).getBuiltinModule(
      'node:sqlite'
    );
    globalForUsersDb.__gharbiaSqliteDb = new sqliteMod.DatabaseSync(dbPath);
  }

  const db = globalForUsersDb.__gharbiaSqliteDb;
  if (!globalForUsersDb.__gharbiaSqliteInitialized) {
    db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS system_users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        national_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT,
        password_salt TEXT,
        password_disabled INTEGER NOT NULL DEFAULT 0,
        job_title TEXT NOT NULL DEFAULT 'موظف تموين',
        job_grade TEXT NOT NULL DEFAULT 'الثالثة التخصصية',
        workplace TEXT NOT NULL DEFAULT 'مديرية التموين بالغربية',
        branch_ids TEXT NOT NULL DEFAULT '["b-03"]',
        primary_branch_id TEXT NOT NULL DEFAULT 'b-03',
        department_ids TEXT NOT NULL DEFAULT '["d-01","d-25"]',
        role TEXT NOT NULL DEFAULT 'bakery_officer',
        status TEXT NOT NULL DEFAULT 'active',
        employee_number TEXT,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        last_login TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_system_users_username ON system_users(username);
    `);

    const countRow = db.prepare('SELECT COUNT(*) as cnt FROM system_users').get();
    const total = Number(countRow?.cnt ?? 0);
    if (total === 0) {
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO system_users (
          id, full_name, national_id, phone, email, username,
          password_hash, password_salt, password_disabled,
          job_title, job_grade, workplace, branch_ids, primary_branch_id,
          department_ids, role, status, employee_number, failed_login_attempts,
          last_login, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `);
      for (const u of INITIAL_USERS) {
        insertStmt.run(
          u.id,
          u.fullName,
          u.nationalId,
          u.phone,
          u.email,
          u.username,
          u.jobTitle,
          u.jobGrade,
          u.workplace,
          JSON.stringify(u.branchIds || [u.primaryBranchId || 'b-03']),
          u.primaryBranchId || 'b-03',
          JSON.stringify(u.departmentIds || ['d-01', 'd-25']),
          u.role,
          u.status || 'active',
          u.employeeNumber || null,
          u.lastLogin || null,
          u.createdAt || new Date().toISOString(),
          new Date().toISOString(),
          u.createdBy || 'system'
        );
      }
    }
    globalForUsersDb.__gharbiaSqliteInitialized = true;
  }

  return db;
}

function safeJsonArray(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  if (typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : fallback;
  } catch {
    return fallback;
  }
}

function rowToStoredUser(row: DbUserRow): StoredSystemUser {
  const hasCustomPassword = Boolean(row.password_hash && row.password_salt && !row.password_disabled);
  return {
    id: row.id,
    fullName: row.full_name,
    nationalId: row.national_id,
    phone: row.phone,
    email: row.email,
    username: row.username,
    passwordDisabled: Boolean(row.password_disabled),
    hasCustomPassword,
    jobTitle: row.job_title,
    jobGrade: row.job_grade,
    workplace: row.workplace,
    branchIds: safeJsonArray(row.branch_ids, [row.primary_branch_id || 'b-03']),
    primaryBranchId: row.primary_branch_id || 'b-03',
    departmentIds: safeJsonArray(row.department_ids, ['d-01', 'd-25']),
    role: row.role as UserRole,
    status: row.status as EmployeeStatus,
    employeeNumber: row.employee_number || undefined,
    failedLoginAttempts: Number(row.failed_login_attempts) || 0,
    lastLogin: row.last_login || undefined,
    createdAt: row.created_at,
    createdBy: row.created_by || undefined,
  };
}

async function syncUserToSupabase(row: DbUserRow): Promise<void> {
  const sb = getValidatedSupabaseAdminConfig();
  if (!sb) return;
  try {
    await fetch(`${sb.baseUrl}/rest/v1/system_users?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: sb.serviceKey,
        Authorization: `Bearer ${sb.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: row.id,
        full_name: row.full_name,
        national_id: row.national_id,
        phone: row.phone,
        email: row.email,
        username: row.username,
        password_hash: row.password_hash,
        password_salt: row.password_salt,
        password_disabled: Boolean(row.password_disabled),
        job_title: row.job_title,
        job_grade: row.job_grade,
        workplace: row.workplace,
        branch_ids: safeJsonArray(row.branch_ids, [row.primary_branch_id]),
        primary_branch_id: row.primary_branch_id,
        department_ids: safeJsonArray(row.department_ids, ['d-01', 'd-25']),
        role: row.role,
        status: row.status,
        employee_number: row.employee_number,
        failed_login_attempts: row.failed_login_attempts,
        last_login: row.last_login,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
      }),
    });
  } catch {
    // SQLite remains authoritative locally if remote Supabase is unreachable
  }
}

async function deleteUserFromSupabase(userId: string): Promise<void> {
  const sb = getValidatedSupabaseAdminConfig();
  if (!sb) return;
  try {
    await fetch(`${sb.baseUrl}/rest/v1/system_users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        apikey: sb.serviceKey,
        Authorization: `Bearer ${sb.serviceKey}`,
      },
    });
  } catch {
    // ignore remote sync failures
  }
}

export function getUsersDbEngineInfo(): {
  engine: 'supabase_sqlite' | 'sqlite';
  labelAr: string;
  labelEn: string;
} {
  const hasSb = Boolean(getValidatedSupabaseAdminConfig());
  if (hasSb) {
    return {
      engine: 'supabase_sqlite',
      labelAr: 'قاعدة بيانات SQLite + مزامنة Supabase الفورية',
      labelEn: 'SQLite + Live Supabase Sync',
    };
  }
  return {
    engine: 'sqlite',
    labelAr: 'قاعدة بيانات SQLite المدمجة (حفظ دائم ومؤمن)',
    labelEn: 'Embedded SQLite Database (Persistent)',
  };
}

export function listDbUsers(): StoredSystemUser[] {
  const db = getSqliteDb();
  const rows = db.prepare('SELECT * FROM system_users ORDER BY created_at DESC').all() as unknown as DbUserRow[];
  return rows.map(rowToStoredUser);
}

export function getDbUserById(id: string): StoredSystemUser | null {
  const db = getSqliteDb();
  const row = db.prepare('SELECT * FROM system_users WHERE id = ? LIMIT 1').get(id) as unknown as DbUserRow | undefined;
  return row ? rowToStoredUser(row) : null;
}

export function getDbUserRowByUsername(username: string): DbUserRow | null {
  const db = getSqliteDb();
  const trimmed = username.trim();
  const row = db
    .prepare('SELECT * FROM system_users WHERE LOWER(username) = LOWER(?) LIMIT 1')
    .get(trimmed) as unknown as DbUserRow | undefined;
  return row || null;
}

export function getDbUserByUsername(username: string): StoredSystemUser | null {
  const row = getDbUserRowByUsername(username);
  return row ? rowToStoredUser(row) : null;
}

export interface CreateDbUserInput {
  id?: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  username: string;
  password?: string;
  jobTitle: string;
  jobGrade: string;
  workplace: string;
  branchIds: string[];
  primaryBranchId: string;
  departmentIds: string[];
  role: UserRole;
  status?: EmployeeStatus;
  employeeNumber?: string;
  createdBy?: string;
}

export async function createDbUser(
  input: CreateDbUserInput
): Promise<{ ok: true; user: StoredSystemUser } | { ok: false; error: string }> {
  const db = getSqliteDb();
  const cleanUsername = input.username.trim();
  const existing = getDbUserRowByUsername(cleanUsername);
  if (existing) {
    return { ok: false, error: 'اسم المستخدم مسجل بالفعل في قاعدة البيانات.' };
  }

  const nowIso = new Date().toISOString();
  const id = input.id?.trim() || `usr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  let passwordHash: string | null = null;
  let passwordSalt: string | null = null;

  if (input.password && input.password.trim().length >= 4) {
    const hashed = hashPasswordScrypt(input.password.trim());
    passwordHash = hashed.hashHex;
    passwordSalt = hashed.saltHex;
  }

  const branchIds = input.branchIds.length > 0 ? input.branchIds : [input.primaryBranchId || 'b-03'];
  const deptIds = input.departmentIds.length > 0 ? input.departmentIds : ['d-01', 'd-25'];
  const empNo = input.employeeNumber || String(Math.floor(10000 + Math.random() * 89999));

  db.prepare(`
    INSERT INTO system_users (
      id, full_name, national_id, phone, email, username,
      password_hash, password_salt, password_disabled,
      job_title, job_grade, workplace, branch_ids, primary_branch_id,
      department_ids, role, status, employee_number, failed_login_attempts,
      last_login, created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)
  `).run(
    id,
    input.fullName.trim(),
    input.nationalId.trim(),
    input.phone.trim(),
    input.email.trim() || `${cleanUsername}@supply.gov.eg`,
    cleanUsername,
    passwordHash,
    passwordSalt,
    input.jobTitle.trim() || 'موظف تموين',
    input.jobGrade.trim() || 'الثالثة التخصصية',
    input.workplace.trim() || 'مديرية التموين بالغربية',
    JSON.stringify(branchIds),
    input.primaryBranchId || branchIds[0] || 'b-03',
    JSON.stringify(deptIds),
    input.role,
    input.status || 'active',
    empNo,
    nowIso,
    nowIso,
    input.createdBy || 'admin'
  );

  const createdRow = db.prepare('SELECT * FROM system_users WHERE id = ? LIMIT 1').get(id) as unknown as DbUserRow;
  void syncUserToSupabase(createdRow);
  return { ok: true, user: rowToStoredUser(createdRow) };
}

export interface UpdateDbUserInput {
  id: string;
  fullName?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  username?: string;
  jobTitle?: string;
  jobGrade?: string;
  workplace?: string;
  branchIds?: string[];
  primaryBranchId?: string;
  departmentIds?: string[];
  role?: UserRole;
  status?: EmployeeStatus;
  password?: string;
  passwordAction?: 'set' | 'delete';
}

export async function updateDbUser(
  input: UpdateDbUserInput
): Promise<{ ok: true; user: StoredSystemUser } | { ok: false; error: string }> {
  const db = getSqliteDb();
  const current = db.prepare('SELECT * FROM system_users WHERE id = ? LIMIT 1').get(input.id) as unknown as DbUserRow | undefined;
  if (!current) {
    return { ok: false, error: 'المستخدم غير موجود في قاعدة البيانات.' };
  }

  const nextUsername = input.username?.trim() || current.username;
  if (nextUsername.toLowerCase() !== current.username.toLowerCase()) {
    const conflict = getDbUserRowByUsername(nextUsername);
    if (conflict && conflict.id !== current.id) {
      return { ok: false, error: 'اسم المستخدم الجديد مستخدم بالفعل لحساب آخر.' };
    }
  }

  let nextPasswordHash = current.password_hash;
  let nextPasswordSalt = current.password_salt;
  let nextPasswordDisabled = current.password_disabled;

  if (input.passwordAction === 'delete') {
    nextPasswordHash = null;
    nextPasswordSalt = null;
    nextPasswordDisabled = 1;
  } else if (input.password && input.password.trim().length >= 4) {
    const hashed = hashPasswordScrypt(input.password.trim());
    nextPasswordHash = hashed.hashHex;
    nextPasswordSalt = hashed.saltHex;
    nextPasswordDisabled = 0;
  }

  const nextPrimaryBranch = input.primaryBranchId || current.primary_branch_id;
  const nextBranchIds = input.branchIds
    ? Array.from(new Set([nextPrimaryBranch, ...input.branchIds]))
    : safeJsonArray(current.branch_ids, [nextPrimaryBranch]);
  const nextDeptIds = input.departmentIds
    ? input.departmentIds
    : safeJsonArray(current.department_ids, ['d-01', 'd-25']);

  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE system_users SET
      full_name = ?,
      national_id = ?,
      phone = ?,
      email = ?,
      username = ?,
      password_hash = ?,
      password_salt = ?,
      password_disabled = ?,
      job_title = ?,
      job_grade = ?,
      workplace = ?,
      branch_ids = ?,
      primary_branch_id = ?,
      department_ids = ?,
      role = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    input.fullName?.trim() || current.full_name,
    input.nationalId?.trim() || current.national_id,
    input.phone?.trim() || current.phone,
    input.email?.trim() || current.email,
    nextUsername,
    nextPasswordHash,
    nextPasswordSalt,
    nextPasswordDisabled,
    input.jobTitle?.trim() || current.job_title,
    input.jobGrade?.trim() || current.job_grade,
    input.workplace?.trim() || current.workplace,
    JSON.stringify(nextBranchIds),
    nextPrimaryBranch,
    JSON.stringify(nextDeptIds),
    input.role || current.role,
    input.status || current.status,
    nowIso,
    current.id
  );

  const updatedRow = db.prepare('SELECT * FROM system_users WHERE id = ? LIMIT 1').get(current.id) as unknown as DbUserRow;
  void syncUserToSupabase(updatedRow);
  return { ok: true, user: rowToStoredUser(updatedRow) };
}

export async function setDbUserPasswordByUsername(
  username: string,
  newPassword: string
): Promise<boolean> {
  const row = getDbUserRowByUsername(username);
  if (!row) return false;
  const hashed = hashPasswordScrypt(newPassword.trim());
  const db = getSqliteDb();
  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE system_users
    SET password_hash = ?, password_salt = ?, password_disabled = 0, updated_at = ?
    WHERE id = ?
  `).run(hashed.hashHex, hashed.saltHex, nowIso, row.id);
  const updatedRow = db.prepare('SELECT * FROM system_users WHERE id = ? LIMIT 1').get(row.id) as unknown as DbUserRow;
  void syncUserToSupabase(updatedRow);
  return true;
}

export async function deleteDbUserPasswordByUsername(username: string): Promise<boolean> {
  const row = getDbUserRowByUsername(username);
  if (!row) return false;
  const db = getSqliteDb();
  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE system_users
    SET password_hash = NULL, password_salt = NULL, password_disabled = 1, updated_at = ?
    WHERE id = ?
  `).run(nowIso, row.id);
  const updatedRow = db.prepare('SELECT * FROM system_users WHERE id = ? LIMIT 1').get(row.id) as unknown as DbUserRow;
  void syncUserToSupabase(updatedRow);
  return true;
}

export function verifyDbUserPasswordByUsername(
  username: string,
  password: string
): { found: boolean; user?: StoredSystemUser; hasCustomPassword: boolean; disabled: boolean; valid: boolean } {
  const row = getDbUserRowByUsername(username);
  if (!row) {
    return { found: false, hasCustomPassword: false, disabled: false, valid: false };
  }
  const user = rowToStoredUser(row);
  if (row.password_disabled) {
    return { found: true, user, hasCustomPassword: true, disabled: true, valid: false };
  }
  if (row.password_hash && row.password_salt) {
    return {
      found: true,
      user,
      hasCustomPassword: true,
      disabled: false,
      valid: verifyPasswordScrypt(password.trim(), row.password_salt, row.password_hash),
    };
  }
  return { found: true, user, hasCustomPassword: false, disabled: false, valid: false };
}

export function touchDbUserLastLogin(id: string): void {
  const db = getSqliteDb();
  const nowIso = new Date().toISOString();
  db.prepare('UPDATE system_users SET last_login = ?, failed_login_attempts = 0, updated_at = ? WHERE id = ?').run(
    nowIso,
    nowIso,
    id
  );
}

export async function deleteDbUsersByIds(
  ids: string[],
  actorUserId: string
): Promise<{ deletedIds: string[]; skippedCount: number }> {
  const db = getSqliteDb();
  const allRows = db.prepare('SELECT * FROM system_users').all() as unknown as DbUserRow[];
  let remainingSuperAdmins = allRows.filter((r) => r.role === 'super_admin').length;

  const deletedIds: string[] = [];
  let skippedCount = 0;

  for (const targetId of ids) {
    const row = allRows.find((r) => r.id === targetId);
    if (!row) continue;
    if (row.id === actorUserId || row.username.toLowerCase() === 'admin') {
      skippedCount++;
      continue;
    }
    if (row.role === 'super_admin' && remainingSuperAdmins <= 1) {
      skippedCount++;
      continue;
    }
    const res = db.prepare('DELETE FROM system_users WHERE id = ?').run(row.id);
    if (res.changes > 0) {
      if (row.role === 'super_admin') remainingSuperAdmins--;
      deletedIds.push(row.id);
      void deleteUserFromSupabase(row.id);
    }
  }

  return { deletedIds, skippedCount };
}
