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
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        temp_password_hash TEXT NOT NULL,
        temp_password_salt TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_hash ON password_reset_tokens(token_hash);
      CREATE TABLE IF NOT EXISTS system_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Ensure admin default email is elhosiny2020@gmail.com
    db.prepare(
      `UPDATE system_users SET email = 'elhosiny2020@gmail.com' WHERE id = 'usr-001' AND (email = 'admin.gharbia@supply.gov.eg' OR email = '')`
    ).run();

    const seededRow = db
      .prepare(`SELECT value FROM system_meta WHERE key = 'initial_users_seeded' LIMIT 1`)
      .get() as { value?: string } | undefined;
    const countRow = db.prepare('SELECT COUNT(*) as cnt FROM system_users').get();
    const total = Number(countRow?.cnt ?? 0);

    if (total === 0 && seededRow?.value !== '1') {
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
      db.prepare(`INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initial_users_seeded', '1')`).run();
    } else if (total > 0 && seededRow?.value !== '1') {
      db.prepare(`INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initial_users_seeded', '1')`).run();
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
  if (!trimmed) return null;
  const row = db
    .prepare(
      `SELECT * FROM system_users
       WHERE LOWER(username) = LOWER(?)
          OR LOWER(email) = LOWER(?)
          OR employee_number = ?
       LIMIT 1`
    )
    .get(trimmed, trimmed, trimmed) as unknown as DbUserRow | undefined;
  return row || null;
}

export function getDbUserByUsername(username: string): StoredSystemUser | null {
  const row = getDbUserRowByUsername(username);
  return row ? rowToStoredUser(row) : null;
}

export function countDbUsers(): number {
  const db = getSqliteDb();
  const row = db.prepare('SELECT COUNT(*) as cnt FROM system_users').get();
  return Number(row?.cnt ?? 0);
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
  newPassword: string,
  fallbackUser?: Partial<CreateDbUserInput>
): Promise<boolean> {
  const row = getDbUserRowByUsername(username);
  if (!row) {
    if (!fallbackUser) return false;
    const created = await createDbUser({
      id: fallbackUser.id,
      fullName: fallbackUser.fullName || username.trim(),
      username: username.trim(),
      password: newPassword.trim(),
      nationalId: fallbackUser.nationalId || '29501011600001',
      phone: fallbackUser.phone || '01000000000',
      email: fallbackUser.email || `${username.trim()}@supply.gov.eg`,
      jobTitle: fallbackUser.jobTitle || 'موظف تموين',
      jobGrade: fallbackUser.jobGrade || 'الثالثة التخصصية',
      workplace: fallbackUser.workplace || 'مديرية التموين بالغربية',
      branchIds: fallbackUser.branchIds?.length ? fallbackUser.branchIds : [fallbackUser.primaryBranchId || 'b-03'],
      primaryBranchId: fallbackUser.primaryBranchId || 'b-03',
      departmentIds: fallbackUser.departmentIds?.length ? fallbackUser.departmentIds : ['d-01', 'd-25'],
      role: fallbackUser.role || 'bakery_officer',
      status: fallbackUser.status || 'active',
      createdBy: fallbackUser.createdBy || 'admin',
    });
    return created.ok;
  }
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
  _actorUserId?: string
): Promise<{ deletedIds: string[]; skippedCount: number }> {
  void _actorUserId;
  const db = getSqliteDb();
  const allRows = db.prepare('SELECT * FROM system_users').all() as unknown as DbUserRow[];
  const deletedIds: string[] = [];

  for (const targetId of ids) {
    const row = allRows.find((r) => r.id === targetId);
    if (!row) continue;
    const res = db.prepare('DELETE FROM system_users WHERE id = ?').run(row.id);
    if (res.changes > 0) {
      deletedIds.push(row.id);
      void deleteUserFromSupabase(row.id);
    }
  }

  db.prepare(`INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initial_users_seeded', '1')`).run();
  return { deletedIds, skippedCount: 0 };
}

export async function wipeAllDbUsers(): Promise<{ deletedCount: number; deletedIds: string[] }> {
  const db = getSqliteDb();
  const allRows = db.prepare('SELECT id FROM system_users').all() as unknown as { id: string }[];
  const deletedIds = allRows.map((r) => r.id);
  const res = db.prepare('DELETE FROM system_users').run();
  db.prepare('DELETE FROM password_reset_tokens').run();
  db.prepare(`INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initial_users_seeded', '1')`).run();

  for (const id of deletedIds) {
    void deleteUserFromSupabase(id);
  }

  return { deletedCount: Number(res.changes ?? deletedIds.length), deletedIds };
}

function hashResetTokenSha256(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export function findDbUserForPasswordReset(identifier: string): StoredSystemUser | null {
  const db = getSqliteDb();
  const clean = identifier.trim();
  if (!clean) return null;

  const row = db
    .prepare(
      `SELECT * FROM system_users
       WHERE LOWER(username) = LOWER(?)
          OR LOWER(email) = LOWER(?)
          OR national_id = ?
          OR phone = ?
       LIMIT 1`
    )
    .get(clean, clean, clean, clean) as unknown as DbUserRow | undefined;

  if (row) return rowToStoredUser(row);

  // Fallback to primary super_admin if target is elhosiny2020@gmail.com
  if (clean.toLowerCase() === 'elhosiny2020@gmail.com') {
    const adminRow = db
      .prepare(`SELECT * FROM system_users WHERE LOWER(username) = 'admin' OR role = 'super_admin' LIMIT 1`)
      .get() as unknown as DbUserRow | undefined;
    if (adminRow) return rowToStoredUser(adminRow);
  }

  return null;
}

export async function createPasswordResetToken(params: {
  userId: string;
  username: string;
  email: string;
}): Promise<{
  resetId: string;
  rawToken: string;
  tempPassword: string;
  expiresAt: string;
}> {
  const db = getSqliteDb();
  const resetId = `rst-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = hashResetTokenSha256(rawToken);

  // Generate a temporary recovery password and apply it immediately so the user can log in with the emailed password OR change it via the link
  const tempPassword = `Gh#${crypto.randomBytes(3).toString('hex').toUpperCase()}26`;
  const tempHashed = hashPasswordScrypt(tempPassword);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 minutes

  // Invalidate previous unused tokens for this user
  db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0`).run(
    params.userId
  );

  db.prepare(
    `INSERT INTO password_reset_tokens (
      id, user_id, username, email, token_hash, temp_password_hash, temp_password_salt, expires_at, used, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    resetId,
    params.userId,
    params.username,
    params.email,
    tokenHash,
    tempHashed.hashHex,
    tempHashed.saltHex,
    expiresAt,
    now.toISOString()
  );

  // Apply the temporary password to the user in SQLite + Supabase so the emailed password works immediately
  await setDbUserPasswordByUsername(params.username, tempPassword);

  return {
    resetId,
    rawToken,
    tempPassword,
    expiresAt,
  };
}

interface DbResetTokenRow {
  id: string;
  user_id: string;
  username: string;
  email: string;
  token_hash: string;
  temp_password_hash: string;
  temp_password_salt: string;
  expires_at: string;
  used: number;
  created_at: string;
}

export function verifyPasswordResetToken(rawToken: string): {
  valid: boolean;
  user?: StoredSystemUser;
  email?: string;
  expiresAt?: string;
  error?: string;
} {
  const clean = rawToken.trim();
  if (!clean || clean.length < 16) {
    return { valid: false, error: 'رمز استعادة كلمة المرور غير صالح.' };
  }
  const db = getSqliteDb();
  const tokenHash = hashResetTokenSha256(clean);
  const row = db
    .prepare(`SELECT * FROM password_reset_tokens WHERE token_hash = ? LIMIT 1`)
    .get(tokenHash) as unknown as DbResetTokenRow | undefined;

  if (!row) {
    return { valid: false, error: 'رابط أو رمز استعادة كلمة المرور غير موجود أو غير صحيح.' };
  }
  if (row.used) {
    return { valid: false, error: 'تم استخدام رابط استعادة كلمة المرور هذا مسبقاً.' };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false, error: 'انتهت صلاحية رابط استعادة كلمة المرور (الصلاحية ٣٠ دقيقة).' };
  }

  const user = getDbUserById(row.user_id) || getDbUserByUsername(row.username);
  if (!user) {
    return { valid: false, error: 'حساب المستخدم المرتبط بالرمز غير موجود.' };
  }

  return {
    valid: true,
    user,
    email: row.email,
    expiresAt: row.expires_at,
  };
}

export async function consumePasswordResetTokenAndSetPassword(
  rawToken: string,
  newPassword: string
): Promise<{ ok: true; user: StoredSystemUser; email: string } | { ok: false; error: string }> {
  const check = verifyPasswordResetToken(rawToken);
  if (!check.valid || !check.user) {
    return { ok: false, error: check.error || 'رمز الاستعادة غير صالح.' };
  }

  const db = getSqliteDb();
  const tokenHash = hashResetTokenSha256(rawToken);

  const updated = await setDbUserPasswordByUsername(check.user.username, newPassword.trim());
  if (!updated) {
    return { ok: false, error: 'تعذر تحديث كلمة المرور في قاعدة البيانات.' };
  }

  db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE token_hash = ?`).run(tokenHash);
  const refreshedUser = getDbUserById(check.user.id) || check.user;
  return {
    ok: true,
    user: refreshedUser,
    email: check.email || 'elhosiny2020@gmail.com',
  };
}

