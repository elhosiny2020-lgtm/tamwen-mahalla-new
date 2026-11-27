import crypto from 'node:crypto';

/**
 * Server-side administrative passcode verification & first-run bootstrap store.
 *
 * Precedence:
 * 1. process.env.ADMIN_BOOTSTRAP_PASSWORD (when configured) ALWAYS overrides any fallback.
 * 2. In preview environments before ADMIN_BOOTSTRAP_PASSWORD is set, the first admin
 *    passcode claimed via scrypt hashing is stored in server memory (never plaintext,
 *    never hardcoded, never written to local files) and verified with timingSafeEqual.
 */

interface ScryptHashRecord {
  saltHex: string;
  keyHex: string;
  claimedAt: string;
  claimedBy: string;
}

const globalForAdminCred = globalThis as unknown as {
  __gharbiaAdminPasscodeHash?: ScryptHashRecord;
  __gharbiaUserPasswordOverrides?: Record<string, { deleted?: boolean; hash?: ScryptHashRecord }>;
};

const SCRYPT_KEYLEN = 64;

function getUserOverrideStore(): Record<string, { deleted?: boolean; hash?: ScryptHashRecord }> {
  if (!globalForAdminCred.__gharbiaUserPasswordOverrides) {
    globalForAdminCred.__gharbiaUserPasswordOverrides = {};
  }
  return globalForAdminCred.__gharbiaUserPasswordOverrides;
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB) && a.length === b.length;
}

function hashPasscodeScrypt(password: string): { saltHex: string; keyHex: string } {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return {
    saltHex: salt.toString('hex'),
    keyHex: derived.toString('hex'),
  };
}

function verifyPasscodeScrypt(password: string, record: ScryptHashRecord): boolean {
  const salt = Buffer.from(record.saltHex, 'hex');
  const expectedKey = Buffer.from(record.keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, expectedKey.length);
  return crypto.timingSafeEqual(derived, expectedKey);
}

export type AdminPasscodeSource = 'env' | 'claimed' | 'unconfigured';

export function getAdminPasscodeStatus(): {
  configured: boolean;
  source: AdminPasscodeSource;
} {
  const envPass = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ?? '';
  if (envPass.length > 0) {
    return { configured: true, source: 'env' };
  }
  if (globalForAdminCred.__gharbiaAdminPasscodeHash) {
    return { configured: true, source: 'claimed' };
  }
  return { configured: false, source: 'unconfigured' };
}

/**
 * Atomically claims the initial admin passcode hash ONLY when:
 * - process.env.ADMIN_BOOTSTRAP_PASSWORD is unset, AND
 * - no admin passcode hash has been claimed yet.
 */
export function claimInitialAdminPasscode(
  password: string,
  claimedBy: string
): { ok: true } | { ok: false; reason: 'already_configured' | 'invalid_password' } {
  const trimmed = password.trim();
  if (trimmed.length < 4 || trimmed.length > 256) {
    return { ok: false, reason: 'invalid_password' };
  }

  const status = getAdminPasscodeStatus();
  if (status.configured) {
    return { ok: false, reason: 'already_configured' };
  }

  const { saltHex, keyHex } = hashPasscodeScrypt(trimmed);
  globalForAdminCred.__gharbiaAdminPasscodeHash = {
    saltHex,
    keyHex,
    claimedAt: new Date().toISOString(),
    claimedBy,
  };
  return { ok: true };
}

/**
 * Verifies a submitted passcode strictly on the server.
 */
export function verifyAdminPasscode(password: string): {
  valid: boolean;
  source: AdminPasscodeSource;
} {
  const envPass = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ?? '';
  if (envPass.length > 0) {
    return {
      valid: timingSafeCompareStrings(password.trim(), envPass),
      source: 'env',
    };
  }

  const record = globalForAdminCred.__gharbiaAdminPasscodeHash;
  if (!record) {
    return { valid: false, source: 'unconfigured' };
  }

  return {
    valid: verifyPasscodeScrypt(password.trim(), record),
    source: 'claimed',
  };
}

export function setServerUserPassword(
  username: string,
  newPassword: string,
  actorUsername: string
): { ok: boolean } {
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = newPassword.trim();
  if (!trimmedUser || trimmedPass.length < 4 || trimmedPass.length > 256) {
    return { ok: false };
  }
  const { saltHex, keyHex } = hashPasscodeScrypt(trimmedPass);
  const record: ScryptHashRecord = {
    saltHex,
    keyHex,
    claimedAt: new Date().toISOString(),
    claimedBy: actorUsername,
  };
  getUserOverrideStore()[trimmedUser] = { deleted: false, hash: record };
  if (trimmedUser === 'admin') {
    globalForAdminCred.__gharbiaAdminPasscodeHash = record;
  }
  return { ok: true };
}

export function deleteServerUserPassword(username: string): void {
  const trimmedUser = username.trim().toLowerCase();
  if (!trimmedUser) return;
  getUserOverrideStore()[trimmedUser] = { deleted: true };
}

export function verifyServerUserPasswordOverride(
  username: string,
  password: string
): { hasOverride: boolean; deleted: boolean; valid: boolean } {
  const entry = getUserOverrideStore()[username.trim().toLowerCase()];
  if (!entry) {
    return { hasOverride: false, deleted: false, valid: false };
  }
  if (entry.deleted || !entry.hash) {
    return { hasOverride: true, deleted: true, valid: false };
  }
  return {
    hasOverride: true,
    deleted: false,
    valid: verifyPasscodeScrypt(password.trim(), entry.hash),
  };
}
